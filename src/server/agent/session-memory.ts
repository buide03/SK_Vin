type Actor = { org: string; id: string };
export type RecentMessage = { role: "user" | "assistant"; content: string };
type Entry = {
  owner: string;
  expires: number;
  lastCommand: string;
  messages: RecentMessage[];
  timer?:ReturnType<typeof setTimeout>;
};
declare global {
  var agentRecentMessages: Map<string, Entry> | undefined;
}
const ttl = 30 * 60 * 1000;
function owner(who: Actor) {
  return JSON.stringify([who.org, who.id]);
}
function key(who: Actor, session: string) {
  return JSON.stringify([who.org, who.id, session]);
}
function entries() {
  const data = (globalThis.agentRecentMessages ??= new Map<string, Entry>());
  for (const [id, item] of data)
    if (item.expires <= Date.now()) remove(data,id);
  return data;
}
function remove(data:Map<string,Entry>,id:string){const entry=data.get(id);if(entry?.timer)clearTimeout(entry.timer);data.delete(id);}
export function recentMessages(who: Actor, session: string): RecentMessage[] {
  return (entries().get(key(who, session))?.messages ?? []).map((x) => ({
    ...x,
  }));
}
export function rememberTurn(
  who: Actor,
  session: string,
  command: string,
  text: string,
  reply: string,
) {
  const data = entries(),
    id = key(who, session),
    previous = data.get(id);
  if (previous?.lastCommand === command) return;
  if (!previous && data.size >= 100) remove(data,data.keys().next().value!);
  if(previous?.timer)clearTimeout(previous.timer);
  const entry:Entry={
    owner: owner(who),
    lastCommand: command,
    expires: Date.now() + ttl,
    messages: [
      ...(previous?.messages ?? []),
      { role: "user", content: text.slice(0, 1500) },
      { role: "assistant", content: reply.slice(0, 1500) },
    ].slice(-6) as RecentMessage[],
  };
  entry.timer=setTimeout(()=>{if(data.get(id)===entry)remove(data,id)},ttl);
  entry.timer.unref();
  data.set(id,entry);
}
export function forgetSession(who: Actor, session: string) {
  remove(entries(),key(who, session));
}
export function forgetStudent(who: Actor) {
  const data = entries();
  for (const [id, item] of data) if (item.owner === owner(who)) remove(data,id);
}
