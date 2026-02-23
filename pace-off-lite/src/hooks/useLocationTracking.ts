import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import { haversineDistanceMeters } from '@/utils/distance';

const MAX_ACCURACY_METERS = 20;
const MAX_SPEED_METERS_PER_SECOND = 10;

export const useLocationTracking = () => {
  const [foregroundStatus, setForegroundStatus] = useState<Location.PermissionStatus | null>(null);
  const [backgroundStatus, setBackgroundStatus] = useState<Location.PermissionStatus | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastAcceptedRef = useRef<Location.LocationObject | null>(null);

  const stopTracking = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
  }, []);

  const startTracking = useCallback(async () => {
    if (subscriptionRef.current) return;

    const foreground = await Location.requestForegroundPermissionsAsync();
    setForegroundStatus(foreground.status);

    if (foreground.status !== 'granted') {
      setError('Foreground location permission not granted.');
      return;
    }

    const background = await Location.requestBackgroundPermissionsAsync();
    setBackgroundStatus(background.status);

    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 0,
      },
      (nextLocation) => {
        const accuracy = nextLocation.coords.accuracy;
        if (accuracy !== null && accuracy >= MAX_ACCURACY_METERS) return;

        const last = lastAcceptedRef.current;
        if (last) {
          const deltaSeconds = (nextLocation.timestamp - last.timestamp) / 1000;
          if (deltaSeconds > 0) {
            const distance = haversineDistanceMeters(
              last.coords.latitude,
              last.coords.longitude,
              nextLocation.coords.latitude,
              nextLocation.coords.longitude
            );
            const speed = distance / deltaSeconds;
            if (speed > MAX_SPEED_METERS_PER_SECOND) return;
          }
        }

        lastAcceptedRef.current = nextLocation;
        setLocation(nextLocation);
      }
    );
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!active) return;
      await startTracking();
    })();

    return () => {
      active = false;
      stopTracking();
    };
  }, [startTracking, stopTracking]);

  return {
    location,
    error,
    foregroundStatus,
    backgroundStatus,
    startTracking,
    stopTracking,
  };
};
