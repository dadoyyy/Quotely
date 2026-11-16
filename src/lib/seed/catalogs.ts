import type { CatalogKind, Unit } from "../constants";

/** A starter item. Money in centavos, markup in basis points (3000 = 30%). Prices are typical, not advice. */
export interface SeedItem {
  name: string;
  description?: string;
  category: string;
  kind: CatalogKind;
  unit: Unit;
  costCents: number;
  markupBps: number;
}

export interface SampleCatalog {
  id: string;
  label: string;
  blurb: string;
  items: SeedItem[];
}

const it = (category: string, kind: CatalogKind, name: string, unit: Unit, pesos: number, markupPct: number, description?: string): SeedItem => ({
  name, description, category, kind, unit, costCents: Math.round(pesos * 100), markupBps: markupPct * 100,
});

export const SAMPLE_CATALOGS: SampleCatalog[] = [
  {
    id: "renovation",
    label: "Home renovation",
    blurb: "Labor by the day, finishing work by the square meter, common materials.",
    items: [
      it("Labor", "labor", "Mason / tile setter", "day", 800, 30),
      it("Labor", "labor", "Carpenter", "day", 900, 30),
      it("Labor", "labor", "Painter", "day", 800, 30),
      it("Labor", "labor", "Electrician", "day", 1000, 30),
      it("Labor", "labor", "Plumber", "day", 1000, 30),
      it("Labor", "labor", "Helper", "day", 550, 30),
      it("Finishing", "service", "Floor tile installation", "sqm", 350, 30, "Labor only. Includes layout, setting and grouting."),
      it("Finishing", "service", "Interior repaint", "sqm", 180, 35, "Two coats over prepared surface. Paint charged separately."),
      it("Finishing", "service", "Gypsum ceiling installation", "sqm", 420, 30),
      it("Finishing", "service", "Demolition and hauling", "lot", 8000, 25),
      it("Materials", "material", "Porcelain tile 60x60", "sqm", 550, 25),
      it("Materials", "material", "Tile adhesive 25 kg", "piece", 380, 20),
      it("Materials", "material", "Latex paint, semi-gloss 4 L", "piece", 1200, 20),
      it("Materials", "material", "Marine plywood 1/2 in", "piece", 1650, 20),
      it("Materials", "material", "Door handle set", "set", 650, 30),
      it("Fees", "fee", "Permit processing assistance", "lot", 3500, 20),
      it("Fees", "fee", "Project supervision", "lot", 6000, 25),
    ],
  },
  {
    id: "events",
    label: "Event organizer",
    blurb: "Coordination, catering by the head, sound and styling for parties and corporate events.",
    items: [
      it("Planning", "service", "Event coordination, full day", "day", 6000, 40),
      it("Planning", "service", "On-the-day coordinator", "day", 3000, 40),
      it("Planning", "service", "Program and invitation design", "lot", 2500, 50),
      it("Catering", "service", "Buffet catering, 5 dishes", "head", 450, 35, "Includes rice, drinks and service staff."),
      it("Catering", "service", "Cocktail reception, 4 canapes", "head", 320, 35),
      it("Catering", "service", "Dessert table", "lot", 4500, 35),
      it("Production", "service", "Lights and sound set", "set", 9000, 30),
      it("Production", "service", "Photo booth, 3 hours", "set", 5500, 40),
      it("Production", "labor", "Host / emcee", "lot", 6000, 30),
      it("Production", "labor", "Live band, 3 hours", "lot", 12000, 25),
      it("Styling", "service", "Venue styling", "lot", 15000, 40),
      it("Styling", "material", "Floral centerpiece", "piece", 650, 45),
      it("Styling", "material", "Tent, tables and chairs (50 guests)", "set", 8000, 30),
      it("Fees", "fee", "Transportation and setup", "lot", 2500, 20),
      it("Fees", "fee", "Venue coordination fee", "lot", 2000, 25),
    ],
  },
  {
    id: "aircon",
    label: "Aircon repair",
    blurb: "Cleaning, recharging, installation and parts, with a service-call fee.",
    items: [
      it("Cleaning", "service", "Split-type aircon cleaning", "piece", 300, 60),
      it("Cleaning", "service", "Window-type aircon cleaning", "piece", 250, 60),
      it("Cleaning", "service", "Chemical overhaul, split type", "piece", 900, 50),
      it("Repair", "service", "Freon recharge (R410A)", "piece", 900, 45),
      it("Repair", "service", "Leak test and repair", "piece", 700, 50),
      it("Repair", "service", "Compressor replacement, labor", "piece", 2500, 40),
      it("Repair", "labor", "Technician", "hour", 250, 50),
      it("Installation", "service", "Split-type installation, up to 1.5 HP", "set", 2500, 40, "Standard 3 m pipe run. Extra pipe charged per meter."),
      it("Installation", "service", "Dismantle and relocate", "set", 2200, 40),
      it("Parts", "material", "Capacitor", "piece", 350, 60),
      it("Parts", "material", "Copper tube, pair", "lm", 380, 30),
      it("Parts", "material", "Drain hose", "lm", 45, 60),
      it("Parts", "material", "Wall bracket set", "set", 300, 50),
      it("Fees", "fee", "Service call and diagnosis", "lot", 500, 20),
    ],
  },
];

export const sampleCatalog = (id: string) => SAMPLE_CATALOGS.find((c) => c.id === id);
