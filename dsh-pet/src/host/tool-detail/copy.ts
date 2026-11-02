/**
 * 气泡文案表：工具名 → 一句话，命令名 → 一句话。
 *
 * 纯数据，不含判定；加工具或改语气只改这里。
 * 必须始终成立：每句都带具体对象，不说空话；不出现参数值（可能含 token 或内网地址）。
 * @module dsh-pet/src/host/tool-detail/copy
 */
import { fileTarget, filesTarget, firstStr, queryTarget, urlHost } from './target.ts';

/** 句子里可用的占位符：{target} 目标名、{cmd} 命令名。 */
export type CopyLine = string;

/** 从解析后的参数里取「目标」（文件名 / 搜索词 / 域名…）；取不到 → null。 */
type TargetPicker = (args: Record<string, unknown>) => string | null;

/** 只描述「怎么取目标」，不含任何文案（文案全部在下面的表里）。 */
export interface ToolRule {
  pick: TargetPicker;
  /**
   * 目标是不是路径：只有路径才做「太长只留文件名」的压缩。
   * 描述、搜索词、域名这类文本不该被 `/` 切开。
   */
  path?: boolean;
}

/** 文件名/图片类：每句都带 {target}。 */
const FILE_COPY: readonly CopyLine[] = ['Peeking at {target}', 'What is inside {target}', 'Taking a look at {target}'];

/** 写文件。 */
const WRITE_COPY: readonly CopyLine[] = [
  'Writing something to {target}',
  'Writing out {target}',
  'Adding stuff to {target}',
];

/** 改文件。 */
const EDIT_COPY: readonly CopyLine[] = ['{target} needs some edits', 'Tweaking {target}', 'Fixing up {target}'];

/** 找文件。 */
const GLOB_COPY: readonly CopyLine[] = ['Where did {target} go', 'Looking for {target}', 'Hunting around for {target}'];

/** 搜内容。 */
const GREP_COPY: readonly CopyLine[] = ['Where is {target} hiding', 'Searching for {target}', 'Tracking down {target}'];

/** 给人看文件。 */
const PRESENT_COPY: readonly CopyLine[] = ['Showing you {target}', 'Letting you see {target}', 'Here you go: {target}'];

/** 学技能。 */
const SKILL_COPY: readonly CopyLine[] = [
  'Learning a new trick: {target}',
  'Remembering {target}',
  'Studying up on {target}',
];

/** 委派子任务。 */
const SUBAGENT_COPY: readonly CopyLine[] = [
  'Getting help: {target}',
  'Helpers checking {target}',
  '{target} is with a helper',
];

/** 一个工具的文案：3 句带 {target} 的说法 + 目标太长时的一句纯氛围兜底。 */
export interface ToolCopy {
  readonly lines: readonly CopyLine[];
  /** 目标超过 TARGET_DISPLAY_MAX 时用：不出现文件名与工具名（气泡是氛围，不是信息面板） */
  readonly short: CopyLine;
}

/** 工具 → 文案。没列在这里的工具走 UNKNOWN_TOOL_LINE。 */
export const TOOL_COPY: Readonly<Record<string, ToolCopy>> = {
  read: { lines: FILE_COPY, short: 'Reading some code' },
  read_image: {
    lines: ['What does {target} look like', 'Let me see {target}', 'What kind of image is {target}'],
    short: 'Checking out this image',
  },
  write: { lines: WRITE_COPY, short: 'Writing something down' },
  edit: { lines: EDIT_COPY, short: 'Making a few edits' },
  str_replace_editor: { lines: EDIT_COPY, short: 'Making a few edits' },
  glob: { lines: GLOB_COPY, short: 'Looking around' },
  grep: { lines: GREP_COPY, short: 'Digging through everything' },
  present: { lines: PRESENT_COPY, short: 'Showing you something' },
  skill: { lines: SKILL_COPY, short: 'Learning a new trick' },
  subagent: { lines: SUBAGENT_COPY, short: 'Calling for backup' },
  subagent_fork: { lines: SUBAGENT_COPY, short: 'Calling for backup' },
  workflow: {
    lines: ['Lining up the work', 'Planning a few things', 'Doing things in order'],
    short: 'Sorting out the work',
  },
  web_search: {
    lines: ['Looking up {target}', 'Searching for {target}', 'Asking the web about {target}'],
    short: 'Searching the web',
  },
  web_fetch: {
    lines: ['Checking out {target}', 'Reading the {target} page', 'Seeing what is on {target}'],
    short: 'Taking a look online',
  },
};

/** 未知工具：只说一句氛围话，不报工具名（`str_replace_editor` 这种名字上屏很怪）。 */
export const UNKNOWN_TOOL_LINE: CopyLine = 'What does this tool do';

/** 兜底：没进表的命令（npm / python / node / tsc / eslint / docker…），短命令名会上屏。 */
export const COMMAND_FALLBACK: readonly CopyLine[] = ['Running {cmd}', '{cmd} is on it', 'Letting {cmd} work'];

/** 兜底：命令名本身太长（如 Get-NetTCPConnection）时用，不带名字。 */
export const COMMAND_NAME_TOO_LONG: CopyLine = 'Running a command';

const CD_COPY: readonly CopyLine[] = ['Changing directory', 'Heading to that folder', 'Moving somewhere else'];

const LS_COPY: readonly CopyLine[] = ['Listing what is here', 'Seeing what is in here', 'Checking this folder'];

const CAT_COPY: readonly CopyLine[] = ['Showing the contents', 'Reading what is inside', 'Having a read through'];

const MKDIR_COPY: readonly CopyLine[] = ['Making a new folder', 'Setting up a folder', 'Creating a directory'];

const RM_COPY: readonly CopyLine[] = ['Cleaning out the junk', 'Deleting these', 'Tidying things up'];

const MV_COPY: readonly CopyLine[] = ['Moving things around', 'Putting it elsewhere', 'Scooting it over there'];

const CP_COPY: readonly CopyLine[] = ['Copying one for later', 'Making a backup copy', 'Duplicating this'];

const CURL_COPY: readonly CopyLine[] = ['Knocking on the endpoint', 'Pinging that address', 'Seeing if it answers'];

const CHECKOUT_COPY: readonly CopyLine[] = ['Switching to that branch', 'Hopping branches', 'Taking another path'];

/** 命令 / 「命令 子命令」→ 3 句候选（键一律小写，别名共用同一组）。 */
export const COMMAND_COPY: Readonly<Record<string, readonly CopyLine[]>> = {
  cd: CD_COPY,
  'set-location': CD_COPY,
  ls: LS_COPY,
  dir: LS_COPY,
  'get-childitem': LS_COPY,
  cat: CAT_COPY,
  'get-content': CAT_COPY,
  mkdir: MKDIR_COPY,
  'new-item': MKDIR_COPY,
  rm: RM_COPY,
  del: RM_COPY,
  'remove-item': RM_COPY,
  mv: MV_COPY,
  'move-item': MV_COPY,
  cp: CP_COPY,
  'copy-item': CP_COPY,
  curl: CURL_COPY,
  'invoke-webrequest': CURL_COPY,

  // git：没命中子命令时用这一组
  git: ['Poking at the git repo', 'Working with git', 'Doing some git stuff'],
  'git status': ['Checking what changed', 'Seeing if the tree is clean', 'Checking the repo state'],
  'git diff': ['Comparing the changes', 'Seeing what got touched', 'Showing the diff'],
  'git log': ['Reading the commit history', 'Looking at recent commits', 'Seeing what got done lately'],
  'git add': ['Collecting the changes', 'Staging the good stuff', 'Adding the edits'],
  'git commit': ['Saving the code', 'Making a commit', 'Recording a snapshot'],
  'git push': ['Pushing it up', 'Sending out the push', 'Letting the remote know'],
  'git pull': ['Pulling the latest', 'Fetching new stuff', 'Syncing up first'],
  'git fetch': ['Asking the remote for news', 'Peeking at the remote', 'Grabbing the latest state'],
  'git checkout': CHECKOUT_COPY,
  'git switch': CHECKOUT_COPY,
  'git branch': ['Looking at the branches', 'Sorting out branches', 'Making a new branch'],
  'git merge': ['Merging the two sides', 'Combining them together', 'Joining the lines'],
  'git rebase': ['Rewriting the history', 'Reordering the commits', 'Straightening the commit order'],
  'git stash': ['Stashing the changes', 'Setting these aside', 'Hiding them for now'],
  'git clone': ['Cloning the whole repo', 'Copying the repo down', 'Fetching a copy'],
  'git reset': ['Undoing the last steps', 'Rolling things back', 'Going back to before'],
  'git tag': ['Tagging this one', 'Putting a version tag', 'Marking a milestone'],
};

/**
 * 语义已由别处表达、不该进气泡的工具：
 * `todo_write` 的文案本身就是气泡正文（写它等于自己盖自己）；`ask_user_question` 与 goal 系已有
 * 专门档位（waiting / success / error）；`exit_plan_mode` 是纯内部调度。
 * 这些报出来不是重复就是噪音。
 */
export const SILENT_TOOLS: ReadonlySet<string> = new Set([
  'todo_write',
  'ask_user_question',
  'create_goal',
  'get_goal',
  'update_goal',
  'exit_plan_mode',
]);

/** 取目标的方式（与文案表按工具名关联；pwsh 不在这里，它走命令表）。 */
export const TOOL_RULES: Readonly<Record<string, ToolRule>> = {
  read: { pick: fileTarget, path: true },
  read_image: { pick: fileTarget, path: true },
  write: { pick: fileTarget, path: true },
  edit: { pick: fileTarget, path: true },
  str_replace_editor: { pick: fileTarget, path: true },
  glob: { pick: (args) => firstStr(args, ['pattern', 'path']) },
  grep: { pick: (args) => firstStr(args, ['pattern', 'path']) },
  web_fetch: { pick: urlHost },
  web_search: { pick: queryTarget },
  subagent: { pick: (args) => firstStr(args, ['description']) },
  subagent_fork: { pick: (args) => firstStr(args, ['description']) },
  workflow: { pick: (args) => firstStr(args, ['name', 'description']) },
  skill: { pick: (args) => firstStr(args, ['name']) },
  present: { pick: filesTarget, path: true },
};
