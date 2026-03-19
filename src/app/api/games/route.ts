import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "src/data/gameResults.json");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { round, winner, loser, winnerScore, loserScore, region } = body;

    if (!round || !winner || !loser) {
      return NextResponse.json(
        { error: "Missing required fields: round, winner, loser" },
        { status: 400 }
      );
    }

    // Read existing results
    let data = { results: [] as Record<string, unknown>[], lastUpdated: null as string | null };
    try {
      const fileContent = await fs.readFile(DATA_FILE, "utf-8");
      data = JSON.parse(fileContent);
    } catch {
      // File doesn't exist or is invalid, start fresh
    }

    // Add new result
    const newResult = {
      round: parseInt(round),
      winner,
      loser,
      winnerScore: winnerScore ? parseInt(winnerScore) : undefined,
      loserScore: loserScore ? parseInt(loserScore) : undefined,
      region: region || "",
      gameId: `manual-${Date.now()}`,
    };

    data.results.push(newResult);
    data.lastUpdated = new Date().toISOString();

    // Write back
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true, result: newResult });
  } catch (error) {
    console.error("Failed to save game result:", error);
    return NextResponse.json(
      { error: "Failed to save game result" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { round, winner, loser } = body;

    const fileContent = await fs.readFile(DATA_FILE, "utf-8");
    const data = JSON.parse(fileContent);

    data.results = data.results.filter(
      (r: Record<string, unknown>) => !(r.round === round && r.winner === winner && r.loser === loser)
    );
    data.lastUpdated = new Date().toISOString();

    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete game result:", error);
    return NextResponse.json(
      { error: "Failed to delete game result" },
      { status: 500 }
    );
  }
}
