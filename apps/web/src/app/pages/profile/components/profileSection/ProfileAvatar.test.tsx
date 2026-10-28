import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { ProfileAvatar } from "./ProfileAvatar";

const refreshUser = vi.fn();
vi.mock("@/app/auth/AuthContext", () => ({
  useAuthContext: () => ({ refreshUser }),
}));

// Radix Avatar only renders the <img> once the browser has loaded it, and jsdom never loads images,
// so we swap it for a plain <img> to be able to check its src
vi.mock("@/shared/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarImage: (props: ComponentProps<"img">) => <img {...props} />,
  AvatarFallback: () => null,
}));

describe("ProfileAvatar upload", () => {
  beforeEach(() => {
    // jsdom has no blob URLs, used for the instant local preview
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ avatarUrl: "/avatars/user-1.png" }), {
          status: 200,
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    refreshUser.mockClear();
  });

  it("shows the new avatar once the backend accepts it, without a page refresh", async () => {
    const { container } = render(<ProfileAvatar avatarUrl="/avatars/default.png" />);
    const avatar = screen.getByAltText("Avatar");
    expect(avatar).toHaveAttribute("src", "/avatars/default.png");

    const file = new File(["fake-image"], "me.png", { type: "image/png" });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [file] } });

    // uploaded to the backend
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/profiles/me/avatar",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    // same <img> element now points at the new file (cache-busted), so no reload was needed
    await waitFor(
      () => expect(avatar.getAttribute("src")).toMatch(/^\/avatars\/user-1\.png\?t=\d+$/),
      { timeout: 3000 }, // component keeps the spinner up for 1s after the upload resolves
    );

    // auth context is refreshed so other components also pick up the new avatar
    expect(refreshUser).toHaveBeenCalledTimes(1);
  });
});
