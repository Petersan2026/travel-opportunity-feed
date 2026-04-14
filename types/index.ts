export type Category = "Domestic" | "Americas" | "Europe" | "Other";

export type Opportunity = {
    id: string;
    category: Category;
    destination: string;
    departureDate: string;
    returnDate: string;
    price: number;
    typicalPrice: number;
    percentBelowTypical: number;
    rawPayload?: unknown;
    observedAt: string;
};