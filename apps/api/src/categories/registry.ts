import { competitorsModule } from "./competitors.js";
import { fundingModule } from "./funding.js";
import { ideaCheckModule } from "./ideaCheck.js";
import { legalModule } from "./legal.js";
import { marketFitModule } from "./marketFit.js";
import { tamModule } from "./tam.js";
import type { CategoryModule } from "./types.js";

export const ALL_MODULES: readonly CategoryModule[] = [
  ideaCheckModule,
  competitorsModule,
  marketFitModule,
  tamModule,
  fundingModule,
  legalModule,
];
