/**
 * host 工具详情映射的单测 —— 钉住五件事：
 *   ① 文案是数据表里的候选句（随机挑一句），且必须带具体对象名；
 *   ② 命令按「命令 / 命令+子命令」查表；没有语义的命令（npm / python / node）走兜底；
 *   ③ 复合命令（`;` `|` `&&` 换行）一律返回 null，让前端回落配置文案；
 *   ④ 安全边界：命令参数（含凭据）不上屏、超大 arguments 不解析、非法 JSON 不抛、
 *      原型链上的名字不命中表；
 *   ⑤ 不该出现的工具（todo_write / ask_user_question / goal 系）→ null。
 *
 * 跑法：node --experimental-strip-types --test src/host/tool-detail.test.ts
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { toolDetailFromEvent } from './tool-detail.ts';
import { TASK_TEXT_MAX } from './work-status.ts';

/** 造一个 tool/call 事件；args 传对象会被序列化成 JSON 字符串（与宿主事件形状一致） */
function call(name: string, args?: Record<string, unknown>): Parameters<typeof toolDetailFromEvent>[0] {
  return { data: { name, arguments: args === undefined ? undefined : JSON.stringify(args) } };
}

/** 文案是随机挑的，断言只能落在候选集合内 */
function oneOf(actual: string | null, expected: readonly string[]): void {
  assert.ok(actual !== null && expected.includes(actual), `得到 ${String(actual)}，不在 [${expected.join(' | ')}] 里`);
}

describe('工具文案 —— 每工具 3 句候选，且带具体对象', () => {
  test('read：文件名必须出现在句子里', () => {
    oneOf(toolDetailFromEvent(call('read', { file_path: 'a.ts' })), [
      'Peeking at a.ts',
      'What is inside a.ts',
      'Taking a look at a.ts',
    ]);
  });

  test('read_image：与 read 用不同的文案（图片 ≠ 文本）', () => {
    oneOf(toolDetailFromEvent(call('read_image', { file_path: 'logo.png' })), [
      'What does logo.png look like',
      'Let me see logo.png',
      'What kind of image is logo.png',
    ]);
  });

  test('edit：长路径压成文件名', () => {
    oneOf(toolDetailFromEvent(call('edit', { file_path: 'D:\\Projects\\Web\\pet\\dsh-pet\\src\\host\\index.ts' })), [
      'index.ts needs some edits',
      'Tweaking index.ts',
      'Fixing up index.ts',
    ]);
  });

  test('write / glob / grep / present / skill / web_search / web_fetch 都能出句', () => {
    oneOf(toolDetailFromEvent(call('write', { file_path: 'notes.md' })), [
      'Writing something to notes.md',
      'Writing out notes.md',
      'Adding stuff to notes.md',
    ]);
    oneOf(toolDetailFromEvent(call('glob', { pattern: '*.ts' })), [
      'Where did *.ts go',
      'Looking for *.ts',
      'Hunting around for *.ts',
    ]);
    oneOf(toolDetailFromEvent(call('grep', { pattern: 'TODO' })), [
      'Where is TODO hiding',
      'Searching for TODO',
      'Tracking down TODO',
    ]);
    oneOf(toolDetailFromEvent(call('present', { files: [{ path: 'a.png' }] })), [
      'Showing you a.png',
      'Letting you see a.png',
      'Here you go: a.png',
    ]);
    oneOf(toolDetailFromEvent(call('skill', { name: 'git-commit' })), [
      'Learning a new trick: git-commit',
      'Remembering git-commit',
      'Studying up on git-commit',
    ]);
    oneOf(toolDetailFromEvent(call('web_search', { queries: ['electron'] })), [
      'Looking up electron',
      'Searching for electron',
      'Asking the web about electron',
    ]);
    oneOf(toolDetailFromEvent(call('web_fetch', { url: 'https://github.com/x/y' })), [
      'Checking out github.com',
      'Reading the github.com page',
      'Seeing what is on github.com',
    ]);
  });

  test('workflow：整句不带对象也能出（不需要目标）', () => {
    oneOf(toolDetailFromEvent(call('workflow')), [
      'Lining up the work',
      'Planning a few things',
      'Doing things in order',
    ]);
  });

  test('拿不到目标 → null（不覆盖已有文案，也不吐半句话）', () => {
    assert.equal(toolDetailFromEvent(call('read')), null);
    assert.equal(toolDetailFromEvent(call('edit', {})), null);
  });
});

describe('pwsh —— 命令 / 子命令查表', () => {
  test('有语义的命令：cd / git 走表', () => {
    oneOf(toolDetailFromEvent(call('pwsh', { command: 'cd D:\\Projects\\Web\\pet' })), [
      'Changing directory',
      'Heading to that folder',
      'Moving somewhere else',
    ]);
    oneOf(toolDetailFromEvent(call('pwsh', { command: 'git status -s' })), [
      'Checking what changed',
      'Seeing if the tree is clean',
      'Checking the repo state',
    ]);
    oneOf(toolDetailFromEvent(call('pwsh', { command: 'git push origin main' })), [
      'Pushing it up',
      'Sending out the push',
      'Letting the remote know',
    ]);
    oneOf(toolDetailFromEvent(call('pwsh', { command: 'git log --oneline -3' })), [
      'Reading the commit history',
      'Looking at recent commits',
      'Seeing what got done lately',
    ]);
  });

  test('git 没命中子命令 → 用通用 git 文案', () => {
    oneOf(toolDetailFromEvent(call('pwsh', { command: 'git frobnicate' })), [
      'Poking at the git repo',
      'Working with git',
      'Doing some git stuff',
    ]);
  });

  test('没有语义的命令（npm / python / node）→ 兜底，带上命令名', () => {
    oneOf(toolDetailFromEvent(call('pwsh', { command: 'npm test' })), [
      'Running npm',
      'npm is on it',
      'Letting npm work',
    ]);
    oneOf(toolDetailFromEvent(call('pwsh', { command: 'python train.py --epochs 10' })), [
      'Running python',
      'python is on it',
      'Letting python work',
    ]);
    oneOf(toolDetailFromEvent(call('pwsh', { command: 'node script.js' })), [
      'Running node',
      'node is on it',
      'Letting node work',
    ]);
  });
});

describe('复合命令 —— 一律不猜，回落配置文案', () => {
  test('分号 / 管道 / && / 换行 都返回 null', () => {
    assert.equal(toolDetailFromEvent(call('pwsh', { command: 'cd D:\\x; npx prettier --write a.ts' })), null);
    assert.equal(toolDetailFromEvent(call('pwsh', { command: 'git status | head -5' })), null);
    assert.equal(toolDetailFromEvent(call('pwsh', { command: 'cd D:\\x && npm test' })), null);
    assert.equal(toolDetailFromEvent(call('pwsh', { command: 'npm test\nnpm run lint' })), null);
    assert.equal(toolDetailFromEvent(call('pwsh', { command: 'echo a || echo b' })), null);
  });

  test('现场那条以字符串字面量开头的复合命令 → null', () => {
    const real =
      '"== 18016 监听 =="; (Get-NetTCPConnection -LocalPort 18016 -State Listen -ErrorAction SilentlyContinue | Measure-Object).Count';
    assert.equal(toolDetailFromEvent(call('pwsh', { command: real })), null);
  });
});

describe('安全与健壮性', () => {
  test('命令参数（含凭据）绝不上屏', () => {
    const detail = toolDetailFromEvent(
      call('pwsh', { command: 'curl -H "Authorization: Bearer sk-live-secret" https://api.example.com' }),
    );
    oneOf(detail, ['Knocking on the endpoint', 'Pinging that address', 'Seeing if it answers']);
    assert.equal(String(detail).includes('sk-live-secret'), false, '凭据不上屏');
    assert.equal(String(detail).includes('api.example.com'), false, '参数不上屏');
  });

  test('事件形状非法 / 非法 JSON / 非对象 → null，不抛', () => {
    assert.equal(toolDetailFromEvent(null), null);
    assert.equal(toolDetailFromEvent({}), null);
    assert.equal(toolDetailFromEvent({ data: { name: 123 } }), null);
    assert.equal(toolDetailFromEvent({ data: { name: 'edit', arguments: '{not json' } }), null);
    assert.equal(toolDetailFromEvent({ data: { name: 'edit', arguments: '[]' } }), null);
  });

  test('原型链上的名字不命中表：constructor / toString / __proto__ 按未知处理', () => {
    for (const name of ['constructor', 'toString', '__proto__', 'valueOf']) {
      assert.equal(toolDetailFromEvent(call(name)), 'What does this tool do', name);
    }
    oneOf(toolDetailFromEvent(call('pwsh', { command: 'constructor' })), [
      'Running constructor',
      'constructor is on it',
      'Letting constructor work',
    ]);
    // 命令表同理：`git constructor` 命中通用 git 文案，不把 `constructor` 当子命令
    oneOf(toolDetailFromEvent(call('pwsh', { command: 'git constructor' })), [
      'Poking at the git repo',
      'Working with git',
      'Doing some git stuff',
    ]);
  });

  test('arguments 直接是对象（非字符串）也认', () => {
    oneOf(toolDetailFromEvent({ data: { name: 'read', arguments: { file_path: 'x/y.ts' } } }), [
      'Peeking at x/y.ts',
      'What is inside x/y.ts',
      'Taking a look at x/y.ts',
    ]);
  });

  test('超大 arguments（write 带整个文件内容）不解析 → null', () => {
    const huge = JSON.stringify({ file_path: 'a.ts', content: 'x'.repeat(70 * 1024) });
    assert.equal(toolDetailFromEvent({ data: { name: 'write', arguments: huge } }), null);
  });

  test('输出永不超过 TASK_TEXT_MAX + 1（省略号）', () => {
    const cases = [
      call('read', { file_path: 'x'.repeat(200) }),
      call('web_search', { queries: ['长'.repeat(200)] }),
      call('frobnicate'),
      call('pwsh', { command: 'a'.repeat(200) }),
    ];
    for (const event of cases) {
      const detail = toolDetailFromEvent(event);
      assert.notEqual(detail, null);
      assert.ok(Array.from(String(detail)).length <= TASK_TEXT_MAX + 1, `超长：${String(detail)}`);
    }
  });
});

describe('目标过长 —— 换一句不带名字的氛围兜底', () => {
  test('grep 的正则太长（现场截图那条）→ 不塞进句子', () => {
    assert.equal(
      toolDetailFromEvent(call('grep', { pattern: 'WORK_STATE_GAP_MS|busyFlip|workFlushTimer' })),
      'Digging through everything',
    );
  });

  test('文件名太长（超过 20 码点）→ 该工具的兜底句', () => {
    assert.equal(
      toolDetailFromEvent(call('read', { file_path: 'work-status-lifecycle.test.ts' })),
      'Reading some code',
    );
    assert.equal(
      toolDetailFromEvent(call('read_image', { file_path: 'some-very-long-image-name.png' })),
      'Checking out this image',
    );
  });

  test('边界：20 码点保留，21 码点回落', () => {
    const twenty = 'a'.repeat(20);
    oneOf(toolDetailFromEvent(call('read', { file_path: twenty })), [
      `Peeking at ${twenty}`,
      `What is inside ${twenty}`,
      `Taking a look at ${twenty}`,
    ]);
    assert.equal(toolDetailFromEvent(call('read', { file_path: 'a'.repeat(21) })), 'Reading some code');
  });

  test('命令名太长 → 不带名字的兜底', () => {
    assert.equal(toolDetailFromEvent(call('pwsh', { command: 'Get-NetTCPConnectionDetail' })), 'Running a command');
  });

  test('短命令名仍然上屏（npm / python 这种有信息量）', () => {
    oneOf(toolDetailFromEvent(call('pwsh', { command: 'npm test' })), [
      'Running npm',
      'npm is on it',
      'Letting npm work',
    ]);
  });
});

describe('兜底与跳过', () => {
  test('未知工具 → 一句氛围话，不报工具名', () => {
    assert.equal(toolDetailFromEvent(call('frobnicate')), 'What does this tool do');
  });

  test('语义已由别处表达的工具 → null（不许盖掉更具体的文案）', () => {
    for (const name of [
      'todo_write',
      'ask_user_question',
      'update_goal',
      'get_goal',
      'create_goal',
      'exit_plan_mode',
    ]) {
      assert.equal(toolDetailFromEvent(call(name, { action: 'complete' })), null, name);
    }
  });
});
