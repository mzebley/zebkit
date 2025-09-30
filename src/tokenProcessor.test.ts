import { mergeTokens } from "../scripts/tokenProcessor";

describe("mergeTokens", () => {
  it("preserves custom root-level overrides while merging styles", () => {
    const defaultTokens = {
      "zbk-button": {
        iconPosition: "end",
        alignment: "center",
        styles: {
          "btn-line-height": {
            value: "1.5",
            type: "lineHeight",
          },
          "btn-font-size": {
            value: "$font-size-md",
            type: "fontSize",
          },
        },
      },
    } as any;

    const customTokenJson = `{
      "zbk-button": {
        "iconPosition": "start",
        "customProp": "custom",
        "styles": {
          "btn-line-height": { "value": "2", "type": "lineHeight" },
          "btn-new-style": { "value": "42px", "type": "sizing" }
        }
      }
    }`;

    const customTokens = JSON.parse(customTokenJson) as any;

    const merged = mergeTokens(defaultTokens, customTokens) as any;

    expect(merged["zbk-button"].iconPosition).toBe("start");
    expect(merged["zbk-button"].alignment).toBe("center");
    expect(merged["zbk-button"].customProp).toBe("custom");
    expect(merged["zbk-button"].styles["btn-line-height"].value).toBe("2");
    expect(merged["zbk-button"].styles["btn-font-size"].value).toBe(
      "$font-size-md"
    );
    expect(merged["zbk-button"].styles["btn-new-style"].value).toBe("42px");

    // Ensure the defaults remain unchanged after merging
    expect((defaultTokens as any)["zbk-button"].iconPosition).toBe("end");
    expect(
      (defaultTokens as any)["zbk-button"].styles["btn-line-height"].value
    ).toBe(
      "1.5"
    );
  });
});
