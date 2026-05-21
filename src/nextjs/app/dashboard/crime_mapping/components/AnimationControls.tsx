

'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import type { AnimationMode, TimeStep } from '../types';


interface AnimationControlsProps {
  animationMode: AnimationMode;
  isAnimating: boolean;
  currentTimeIndex: number;
  animationSpeed: number;
  animationProgress: number;
  timeSteps: TimeStep[];
  onStartAnimation: (mode: 'years' | 'months') => void;
  onStopAnimation: () => void;
  onTogglePlayPause: () => void;
  onSkipToStart: () => void;
  onSkipToEnd: () => void;
  onTimeIndexChange: (index: number) => void;
  onSpeedChange: (speed: number) => void;
  onPause: () => void;
}


export default function AnimationControls({
  animationMode,
  isAnimating,
  currentTimeIndex,
  animationSpeed,
  animationProgress,
  timeSteps,
  onStartAnimation,
  onStopAnimation,
  onTogglePlayPause,
  onSkipToStart,
  onSkipToEnd,
  onTimeIndexChange,
  onSpeedChange,
  onPause,
}: AnimationControlsProps) {
  return (
    <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border border-blue-500/20 rounded-xl shadow-sm px-6 py-4 mb-6 shrink-0">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Transport controls */}
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          {animationMode === 'none' ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => onStartAnimation('years')}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Animate by Year
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => onStartAnimation('months')}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Animate by Month
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onSkipToStart}
                disabled={currentTimeIndex === 0}
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                variant={isAnimating ? 'default' : 'outline'}
                size="sm"
                onClick={onTogglePlayPause}
                className="gap-2"
              >
                {isAnimating ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    {currentTimeIndex >= timeSteps.length - 1
                      ? 'Restart'
                      : 'Play'}
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onSkipToEnd}
                disabled={currentTimeIndex === timeSteps.length - 1}
              >
                <SkipForward className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onStopAnimation}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Stop Animation
              </Button>
            </>
          )}
        </div>

        {/* Timeline slider */}
        {animationMode !== 'none' && (
          <div className="flex-1 max-w-2xl">
            <div className="space-y-2">
              <Slider
                value={[currentTimeIndex]}
                min={0}
                max={timeSteps.length - 1}
                step={1}
                onValueChange={(value) => {
                  onTimeIndexChange(value[0]);
                  onPause();
                }}
                className="w-full"
              />

              {isAnimating && (
                <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-100 ease-linear"
                    style={{ width: `${animationProgress * 100}%` }}
                  />
                </div>
              )}

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{timeSteps[0]?.label}</span>
                <span className="font-semibold text-blue-700 dark:text-blue-400">
                  {currentTimeIndex >= timeSteps.length - 1 && !isAnimating ? (
                    <span className="text-green-600 dark:text-green-400">✓ Complete</span>
                  ) : (
                    <>
                      {timeSteps[currentTimeIndex]?.label}
                      {isAnimating &&
                        animationProgress > 0 &&
                        currentTimeIndex < timeSteps.length - 1 && (
                          <span className="text-muted-foreground/70 ml-1">
                            → {timeSteps[currentTimeIndex + 1]?.label}
                          </span>
                        )}
                    </>
                  )}
                </span>
                <span>{timeSteps[timeSteps.length - 1]?.label}</span>
              </div>
            </div>
          </div>
        )}

        {/* Speed selector */}
        {animationMode !== 'none' && (
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Speed:</Label>
            <Select
              value={animationSpeed.toString()}
              onValueChange={(v) => onSpeedChange(Number(v))}
            >
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3000">Slow (0.3x)</SelectItem>
                <SelectItem value="2000">0.5x</SelectItem>
                <SelectItem value="1000">Normal (1x)</SelectItem>
                <SelectItem value="500">Fast (2x)</SelectItem>
                <SelectItem value="250">Very Fast (4x)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
