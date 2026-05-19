import { CourseHole, CourseProviderId, TeeBox } from '@/types/models';

export type CourseSearchResult = {
  sourceId: string;
  sourceProvider: CourseProviderId;
  name: string;
  location: string;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  holesCount: number;
  par: number;
  tees: TeeBox[];
  holes: CourseHole[];
};

export type CourseSearchProvider = {
  id: CourseProviderId;
  label: string;
  searchCourses: (query: string) => Promise<CourseSearchResult[]>;
};

export const MOCK_COURSES: CourseSearchResult[] = [
  buildMockCourse({
    sourceId: 'mock-riverview-municipal',
    name: 'Riverview Municipal',
    city: 'Hartford',
    state: 'CT',
    country: 'USA',
    latitude: 41.7658,
    longitude: -72.6734,
    par: 72,
    teeSpecs: [
      { id: 'riverview-blue', name: 'Blue Tees', color: 'Blue', totalYards: 6482, rating: 71.8, slope: 129 },
      { id: 'riverview-white', name: 'White Tees', color: 'White', totalYards: 6110, rating: 70.2, slope: 124 },
      { id: 'riverview-red', name: 'Red Tees', color: 'Red', totalYards: 5384, rating: 72.4, slope: 126 },
    ],
    pars: [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 3, 5, 4],
  }),
  buildMockCourse({
    sourceId: 'mock-willow-creek',
    name: 'Willow Creek Golf Club',
    city: 'Westchester',
    state: 'NY',
    country: 'USA',
    latitude: 41.1221,
    longitude: -73.7949,
    par: 71,
    teeSpecs: [
      { id: 'willow-black', name: 'Black Tees', color: 'Black', totalYards: 6821, rating: 73.6, slope: 136 },
      { id: 'willow-gold', name: 'Gold Tees', color: 'Gold', totalYards: 6287, rating: 71.1, slope: 129 },
      { id: 'willow-green', name: 'Green Tees', color: 'Green', totalYards: 5538, rating: 68.9, slope: 119 },
    ],
    pars: [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 5, 3, 4, 4, 4, 3, 5, 4],
  }),
  buildMockCourse({
    sourceId: 'mock-three-ridges',
    name: 'Three Ridges Links',
    city: 'Asheville',
    state: 'NC',
    country: 'USA',
    latitude: 35.5951,
    longitude: -82.5515,
    par: 72,
    teeSpecs: [
      { id: 'ridges-championship', name: 'Championship', color: 'Blue', totalYards: 6610, rating: 72.2, slope: 131 },
      { id: 'ridges-member', name: 'Member', color: 'White', totalYards: 6078, rating: 70.4, slope: 124 },
    ],
    pars: [4, 5, 3, 4, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 3, 5, 4],
  }),
  buildMockCourse({
    sourceId: 'mock-dead-horse-lake',
    name: 'Dead Horse Lake',
    city: 'Austin',
    state: 'TX',
    country: 'USA',
    latitude: 30.2672,
    longitude: -97.7431,
    par: 70,
    teeSpecs: [
      { id: 'deadhorse-tips', name: 'Tips', color: 'Black', totalYards: 6410, rating: 72.1, slope: 132 },
      { id: 'deadhorse-middle', name: 'Middle', color: 'Silver', totalYards: 5938, rating: 69.9, slope: 124 },
      { id: 'deadhorse-forward', name: 'Forward', color: 'Gold', totalYards: 5214, rating: 68.1, slope: 116 },
    ],
    pars: [4, 4, 3, 4, 5, 4, 3, 4, 4, 4, 5, 3, 4, 4, 4, 3, 5, 3],
  }),
];

export const mockCourseProvider: CourseSearchProvider = {
  id: 'mock',
  label: 'Mock course catalog',
  async searchCourses(query: string) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return MOCK_COURSES.slice(0, 4);
    }

    return MOCK_COURSES.filter((course) =>
      `${course.name} ${course.location} ${course.city} ${course.state}`.toLowerCase().includes(normalized)
    ).slice(0, 8);
  },
};

export function getDefaultCourseProvider() {
  return mockCourseProvider;
}

function buildMockCourse(input: {
  sourceId: string;
  name: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  par: number;
  teeSpecs: TeeBox[];
  pars: number[];
}): CourseSearchResult {
  const location = `${input.city}, ${input.state}`;
  const holes = input.pars.map((par, index) => ({
    number: index + 1,
    par,
    handicapIndex: ((index * 3) % 18) + 1,
    yardagesByTee: Object.fromEntries(
      input.teeSpecs.map((tee, teeIndex) => {
        const base = Math.round((tee.totalYards ?? 0) / input.pars.length);
        return [tee.id, Math.max(95, base + ((index % 3) - 1) * 12 - teeIndex * 18)];
      })
    ),
  }));

  return {
    sourceId: input.sourceId,
    sourceProvider: 'mock',
    name: input.name,
    location,
    city: input.city,
    state: input.state,
    country: input.country,
    latitude: input.latitude,
    longitude: input.longitude,
    holesCount: input.pars.length,
    par: input.par,
    tees: input.teeSpecs,
    holes,
  };
}
