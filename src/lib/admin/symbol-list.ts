import "server-only";
import { prisma } from "@/lib/db";
import { moveTo } from "./symbols";

/**
 * Database operations shared by the two admin stock lists. Both tables have
 * the same shape (symbol, position, isActive), so one set of operations
 * keeps their behaviour identical: positions are always rewritten as 0..n-1
 * after a change, so ordering never drifts into gaps or ties.
 */

export type SymbolTable = "universe" | "strip";

interface Row {
  symbol: string;
  position: number;
  isActive: boolean;
}

interface ListDelegate {
  findMany(args: { orderBy: { position: "asc" } }): Promise<Row[]>;
  findUnique(args: { where: { symbol: string } }): Promise<Row | null>;
  create(args: { data: { symbol: string; position: number } }): Promise<Row>;
  update(args: { where: { symbol: string }; data: Partial<Row> }): Promise<Row>;
  delete(args: { where: { symbol: string } }): Promise<Row>;
  deleteMany(args: object): Promise<{ count: number }>;
}

function table(name: SymbolTable): ListDelegate {
  return (name === "universe" ? prisma.universeStock : prisma.tickerStripItem) as unknown as ListDelegate;
}

export async function listSymbols(name: SymbolTable): Promise<Row[]> {
  return table(name).findMany({ orderBy: { position: "asc" } });
}

/** Appends codes not already listed. Returns what was added and what was there. */
export async function addSymbols(name: SymbolTable, symbols: string[]) {
  const existing = new Set((await listSymbols(name)).map((r) => r.symbol));
  const added = symbols.filter((s) => !existing.has(s));
  let position = existing.size;
  for (const symbol of added) {
    await table(name).create({ data: { symbol, position: position++ } });
  }
  return { added, alreadyListed: symbols.filter((s) => existing.has(s)) };
}

async function writeOrder(name: SymbolTable, order: string[]) {
  await prisma.$transaction(
    order.map((symbol, position) =>
      // The same transaction for either table; the cast only names the shape.
      (table(name).update({ where: { symbol }, data: { position } }) as unknown as ReturnType<typeof prisma.universeStock.update>),
    ),
  );
}

/** Moves a code to a 1-based position, or one step up or down. */
export async function moveSymbol(name: SymbolTable, symbol: string, to: number | "up" | "down"): Promise<boolean> {
  const order = (await listSymbols(name)).map((r) => r.symbol);
  const from = order.indexOf(symbol);
  if (from < 0) return false;
  const target = to === "up" ? from : to === "down" ? from + 2 : to;
  await writeOrder(name, moveTo(order, symbol, target));
  return true;
}

export async function toggleSymbol(name: SymbolTable, symbol: string): Promise<boolean> {
  const row = await table(name).findUnique({ where: { symbol } });
  if (!row) return false;
  await table(name).update({ where: { symbol }, data: { isActive: !row.isActive } });
  return true;
}

export async function removeSymbol(name: SymbolTable, symbol: string): Promise<boolean> {
  const row = await table(name).delete({ where: { symbol } }).catch(() => null);
  if (!row) return false;
  await writeOrder(name, (await listSymbols(name)).map((r) => r.symbol));
  return true;
}

/** Replaces the whole list, in the order given. */
export async function replaceSymbols(name: SymbolTable, symbols: string[]) {
  await table(name).deleteMany({});
  await addSymbols(name, symbols);
}
