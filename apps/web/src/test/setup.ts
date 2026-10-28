/* 
This registers the jest-dom checks (toBeInTheDocument, etc.) once for all tests, so you don't import them in every file.


*/
import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// RTL only auto-unmounts between tests when vitest `globals` is on, so we do it here
afterEach(() => cleanup());
