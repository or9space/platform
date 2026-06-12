import { describe, it, expect } from "vitest";
import {
  CONTENT_TYPES,
  CUSTOM_FIELD_ELIGIBLE_TYPES,
  isCustomFieldEligible,
} from "@/lib/content-types";

describe("content type registry", () => {
  it("declares 25 content types", () => {
    expect(CONTENT_TYPES.length).toBe(25);
  });

  it("declares 9 custom-field-eligible types", () => {
    expect(CUSTOM_FIELD_ELIGIBLE_TYPES.length).toBe(9);
  });

  it("forum_thread is custom-field-eligible", () => {
    expect(isCustomFieldEligible("forum_thread")).toBe(true);
  });

  it("forum_post is NOT custom-field-eligible (sub-table)", () => {
    expect(isCustomFieldEligible("forum_post")).toBe(false);
  });

  it("each content type maps to a feature flag", () => {
    for (const ct of CONTENT_TYPES) {
      expect(ct.featureFlag).toBeTruthy();
    }
  });
});
