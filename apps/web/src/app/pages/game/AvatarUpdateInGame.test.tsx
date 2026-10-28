import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import PlayerList from "./components/PlayerList";
import { useGamePage, type PlayerListItem } from "./hooks/useGamePage";

// Fake socket: records listeners so the test can play the server's role
const { fakeSocket, serverEmits, auth } = vi.hoisted(() => {
  const listeners = new Map<string, Set<(payload: unknown) => void>>();
  return {
    fakeSocket: {
      on: (event: string, fn: (payload: unknown) => void) => {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(fn);
      },
      off: (event: string, fn?: (payload: unknown) => void) => {
        if (fn) listeners.get(event)?.delete(fn);
        else listeners.delete(event);
      },
      emit: () => {},
      reset: () => listeners.clear(),
    },
    serverEmits: (event: string, payload: unknown) =>
      listeners.get(event)?.forEach((fn) => fn(payload)),
    auth: { user: { id: "", username: "" } }, // the logged-in player whose screen we render
  };
});

vi.mock("@/socket/Socket", () => ({ socket: fakeSocket }));
vi.mock("@/app/auth/AuthContext", () => ({ useAuthContext: () => auth }));

// Same wiring as GamePage: the hook feeds the player list shown during the game
function GameHarness({ username }: { username: string }) {
  const { playerList } = useGamePage("room-1");
  return <PlayerList playerList={playerList} clientUsername={username} />;
}

const player = (userName: string, avatarUrl: string): PlayerListItem => ({
  playerId: `id-${userName}`,
  userName,
  avatarUrl,
  dropped: false,
  isPlayerTurn: false,
});

// Shape of the room_info_response the backend broadcasts to the room
const roomInfo = (players: PlayerListItem[]) => ({
  roomId: "r1",
  roomName: "room-1",
  roomState: "playing",
  players,
  playerTurnId: "id-alice",
  playerTurnUserName: "alice",
});

describe("avatar update during an ongoing game", () => {
  beforeEach(() => fakeSocket.reset());

  it.each(["alice", "bob"])(
    "shows alice's new avatar to %s without a refresh",
    (viewer) => {
      auth.user = { id: `id-${viewer}`, username: viewer };
      render(<GameHarness username={viewer} />);

      act(() =>
        serverEmits(
          "room_info_response",
          roomInfo([player("alice", "/avatars/default.png"), player("bob", "/avatars/id-bob.png")]),
        ),
      );
      const aliceAvatar = screen.getByAltText("alice");
      expect(aliceAvatar.getAttribute("src")).toMatch(/^\/avatars\/default\.png/);

      // alice uploads a new avatar: backend updates the room and broadcasts it to everyone in it
      act(() =>
        serverEmits(
          "room_info_response",
          roomInfo([
            player("alice", "/avatars/id-alice.png?v=123"),
            player("bob", "/avatars/id-bob.png"),
          ]),
        ),
      );

      expect(screen.getByAltText("alice").getAttribute("src")).toMatch(
        /^\/avatars\/id-alice\.png\?v=123/,
      );
      // the game is still running and the other player is untouched
      expect(screen.getByAltText("bob").getAttribute("src")).toMatch(/^\/avatars\/id-bob\.png/);
    },
  );
});
