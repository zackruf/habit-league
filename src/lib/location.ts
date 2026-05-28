import * as Location from 'expo-location';

import { Course } from '@/types/models';

export type CourseSuggestion = {
  course: Course;
  distanceFromCourseMeters: number;
};

export async function suggestNearestCourse(courses: Course[]): Promise<CourseSuggestion | null> {
  const candidates = courses.filter((course) => typeof course.latitude === 'number' && typeof course.longitude === 'number');
  if (!candidates.length) {
    return null;
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    return null;
  }

  const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const nearest = candidates
    .map((course) => ({
      course,
      distanceFromCourseMeters: getDistanceMeters(
        current.coords.latitude,
        current.coords.longitude,
        course.latitude ?? 0,
        course.longitude ?? 0
      ),
    }))
    .sort((left, right) => left.distanceFromCourseMeters - right.distanceFromCourseMeters)[0];

  return nearest ?? null;
}

function getDistanceMeters(startLatitude: number, startLongitude: number, endLatitude: number, endLongitude: number) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(endLatitude - startLatitude);
  const deltaLongitude = toRadians(endLongitude - startLongitude);
  const startLat = toRadians(startLatitude);
  const endLat = toRadians(endLatitude);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2);
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
