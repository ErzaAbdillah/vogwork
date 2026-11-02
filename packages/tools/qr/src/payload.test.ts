import { describe, expect, it } from "vitest";
import { buildPayload, contrastRatio, emptyData, normalizePhone } from "./payload";

describe("payload QR", () => {
  it("WiFi dengan karakter khusus di-escape", () => {
    expect(buildPayload("wifi", { ...emptyData, wifiSsid: "Kantor;Lt2", wifiPassword: 'a"b' })).toBe('WIFI:T:WPA;S:Kantor\\;Lt2;P:a\\"b;;');
    expect(buildPayload("wifi", { ...emptyData, wifiSsid: "Tamu", wifiSecurity: "nopass" })).toBe("WIFI:T:nopass;S:Tamu;;");
  });

  it("nomor WhatsApp lokal menjadi 62", () => {
    expect(normalizePhone("0812-3456-7890")).toBe("6281234567890");
    expect(normalizePhone("+62 812 3456")).toBe("628123456");
    expect(buildPayload("whatsapp", { ...emptyData, waPhone: "08123", waMessage: "Halo kak" })).toBe("https://wa.me/628123?text=Halo%20kak");
  });

  it("email dengan subjek", () => {
    expect(buildPayload("email", { ...emptyData, emailTo: "a@b.id", emailSubject: "Rapat besok" })).toBe("mailto:a@b.id?subject=Rapat%20besok");
  });

  it("vCard minimal", () => {
    const vcard = buildPayload("vcard", { ...emptyData, vName: "Budi, S.T.", vPhone: "0812" });
    expect(vcard).toContain("FN:Budi\\, S.T.");
    expect(vcard).toContain("TEL;TYPE=CELL:+62812");
  });

  it("kontras", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contrastRatio("#777777", "#888888")).toBeLessThan(2);
  });
});
