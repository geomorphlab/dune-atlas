// Tab title "MGL - Dune Atlas" and the lab icon (PI round 6 item 4), Earth (index.html as built).
import { describe, it } from "vitest";
import { INDEX, checkHead } from "./headlib";

describe("page head (Earth)", () => {
  it("title in the group site style; base-relative icon links; icon files", () => { checkHead(INDEX); });
});
