

'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { CrimeLocation } from '@/lib/types/crimes';
import type {
  AnimationMode,
  TimeStep,
} from '../types';
import { MONTHS } from '../types';

interface UseAnimationArgs {
  allLocations: CrimeLocation[];
}

interface UseAnimationReturn {
  animationMode: AnimationMode;
  isAnimating: boolean;
  currentTimeIndex: number;
  animationSpeed: number;
  setAnimationSpeed: (speed: number) => void;
  animationProgress: number;
  timeSteps: TimeStep[];
  availableYears: number[];
  startAnimation: (mode: 'years' | 'months') => void;
  stopAnimation: () => void;
  togglePlayPause: () => void;
  skipToStart: () => void;
  skipToEnd: () => void;
  setCurrentTimeIndex: (index: number) => void;
  setIsAnimating: (animating: boolean) => void;
}

export function useAnimation({
  allLocations,
}: UseAnimationArgs): UseAnimationReturn {
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  const [animationMode, setAnimationMode] = useState<AnimationMode>('none');
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1000);
  const [animationProgress, setAnimationProgress] = useState(0);


  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allLocations.forEach((loc) => {
      const year = new Date(loc.dateCommitted!).getFullYear();
      if (!isNaN(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [allLocations]);


  const timeSteps = useMemo((): TimeStep[] => {
    if (animationMode === 'years') {
      return availableYears.map((year) => ({
        year,
        label: year.toString(),
      }));
    }

    if (animationMode === 'months') {
      const steps: TimeStep[] = [];
      availableYears.forEach((year) => {
        MONTHS.forEach((month) => {
          steps.push({
            year,
            month: month.value,
            label: `${month.label} ${year}`,
          });
        });
      });
      return steps;
    }

    return [];
  }, [animationMode, availableYears]);



  // Animation controls


  const startAnimation = useCallback((mode: 'years' | 'months') => {
    setAnimationMode(mode);
    setCurrentTimeIndex(0);
    setIsAnimating(true);
    lastUpdateTimeRef.current = 0;
  }, []);


  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
    setAnimationMode('none');
    setCurrentTimeIndex(0);
  }, []);


  const togglePlayPause = useCallback(() => {
    if (!isAnimating && currentTimeIndex >= timeSteps.length - 1) {
      setCurrentTimeIndex(0);
      setAnimationProgress(0);
      setIsAnimating(true);
      lastUpdateTimeRef.current = performance.now();
    } else {
      setIsAnimating((prev) => !prev);
    }
  }, [isAnimating, currentTimeIndex, timeSteps.length]);


  const skipToStart = useCallback(() => {
    setCurrentTimeIndex(0);
    setIsAnimating(false);
  }, []);


  const skipToEnd = useCallback(() => {
    setCurrentTimeIndex(timeSteps.length - 1);
    setIsAnimating(false);
  }, [timeSteps.length]);

  // Animation loop

  useEffect(() => {
    if (!isAnimating || animationMode === 'none' || timeSteps.length === 0) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setAnimationProgress(0);
      return;
    }

    const animate = (timestamp: number) => {
      const elapsed = timestamp - lastUpdateTimeRef.current;
      const progress = Math.min(elapsed / animationSpeed, 1);

      setAnimationProgress(progress);

      if (progress >= 1) {
        if (currentTimeIndex >= timeSteps.length - 1) {
          setIsAnimating(false);
          setAnimationProgress(0);
          if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          return;
        }

        setCurrentTimeIndex((prev) => prev + 1);
        lastUpdateTimeRef.current = timestamp;
        setAnimationProgress(0);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isAnimating, animationMode, timeSteps.length, animationSpeed, currentTimeIndex]);

  return {
    animationMode,
    isAnimating,
    currentTimeIndex,
    animationSpeed,
    setAnimationSpeed,
    animationProgress,
    timeSteps,
    availableYears,
    startAnimation,
    stopAnimation,
    togglePlayPause,
    skipToStart,
    skipToEnd,
    setCurrentTimeIndex,
    setIsAnimating,
  };
}
