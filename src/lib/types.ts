export type CountrySummary = {
  iso2: string;
  iso3: string;
  name: string;
  continent: string;
  flagCode: string;
  rate: number | null;
  rateDate: string | null;
  hasHistory: boolean;
  historyStart: string | null;
  historyEnd: string | null;
  historyCount: number;
};

export type Observation = { d: string; v: number };

export type CountryFile = {
  iso2: string;
  iso3: string;
  name: string;
  continent: string;
  flagCode: string;
  latest: { rate: number; date: string; source: string } | null;
  sources: { history: string | null; current: string | null };
  history: Observation[];
};

export type Coverage = {
  generatedAt: string;
  totals: {
    countriesSurfaced: number;
    withHistorySeries: number;
    currentOnly: number;
  };
  withHistory: { iso2: string; name: string; historyStart: string; historyEnd: string; historyCount: number }[];
  currentOnly: { iso2: string; name: string; rate: number; rateDate: string }[];
  unknownBisReferenceAreas: string[];
  wikipediaNamesUnmapped: string[];
  sources: {
    historical: { name: string; url: string; bulk: string; frequency: string };
    current: { name: string; url: string; snapshotDate: string };
  };
};
