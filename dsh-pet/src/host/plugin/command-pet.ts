/**
 * 斜杠命令 /pet：按 id 或名字切换当前桌宠。
 * @module dsh-pet/src/host/plugin/command-pet
 */
import type { BalancePoll } from './balance-poll.ts';
import type { ChatMemory } from './chat-memory.ts';
import type { HostContext } from './context.ts';

/** 桌宠选择命令的输入。 */
export type CommandPetInput = {
  /** 宿主上下文（apply 收到的那一个）。 */
  ctx: HostContext;
} & Pick<BalancePoll, 'effectivePetList'> &
  Pick<BalancePoll, 'petDisplayName'> &
  Pick<BalancePoll, 'resolveActivePetId'> &
  Pick<ChatMemory, 'setActivePetId'>;

/** 注册桌宠选择命令；返回的清理函数由 ctx.effect 收集。 */
export function registerPetCommand(deps: CommandPetInput): void {
  const { ctx, effectivePetList, petDisplayName, resolveActivePetId, setActivePetId } = deps;
  // /pet 斜杠命令：选择「当前桌宠」（/chat 对话的目标）。浏览器端另有 commandUi 装饰的选择框
  // （裸输 /pet 回车或菜单点选时弹出，选中后提交 /pet <id> 走同一 handler）；手输参数认 id 或名字
  // （name 可重复：唯一命中才认，重名报错列出候选 id）。
  ctx.effect(
    () =>
      ctx.commands.register({
        name: 'pet',
        description: 'Choose the pet (/chat targets it; use the picker or type an id/name)',
        input: { hint: '[pet id or name] (empty shows the current one)' },
        handler: ({ rawInput }: { rawInput: string }) => {
          const arg = rawInput.trim();
          let eff: Record<string, unknown>[];
          try {
            eff = effectivePetList();
          } catch {
            eff = [];
          }
          if (!arg) {
            const cur = resolveActivePetId();
            const found = eff.find((p) => String(p.id) === cur);
            return {
              kind: 'success',
              text: 'Current pet: ' + (found ? petDisplayName(found) : cur || '(no pet to interact with)'),
            };
          }
          const byId = eff.find((p) => String(p.id) === arg);
          if (byId) {
            setActivePetId(String(byId.id));
            return { kind: 'success', text: 'Selected pet: ' + petDisplayName(byId) };
          }
          const byName = eff.filter((p) => petDisplayName(p) === arg);
          if (byName.length === 1) {
            setActivePetId(String(byName[0].id));
            return { kind: 'success', text: 'Selected pet: ' + petDisplayName(byName[0]) };
          }
          if (byName.length > 1) {
            return {
              kind: 'error',
              text:
                '"' +
                arg +
                '" matches ' +
                byName.length +
                ' pets (ids: ' +
                byName.map((p) => String(p.id)).join(', ') +
                '), please pick one by id',
            };
          }
          return {
            kind: 'error',
            text: 'No pet found for "' + arg + '" (id or name both work; press /pet and Enter to open the picker)',
          };
        },
      }),
    'dsh-pet: /pet command',
  );
}
