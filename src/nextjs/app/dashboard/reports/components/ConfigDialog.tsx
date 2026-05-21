"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input, OptimizationConfig } from "../utils";

interface ConfigDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    config: OptimizationConfig;
    setConfig: (config: OptimizationConfig) => void;
    onSave: () => void;
}

export function ConfigDialog({ isOpen, onOpenChange, config, setConfig, onSave }: ConfigDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Configuration</DialogTitle>
                    <DialogDescription>
                        Adjust parameters for schedule generation
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-4">
                    <div>
                        <Label>Min Personnel per Team</Label>
                        <Input
                            type="number"
                            min="1"
                            value={config.minPersonnelPerTeam}
                            onChange={(e) => setConfig({ ...config, minPersonnelPerTeam: parseInt(e.target.value) })}
                        />
                    </div>

                    <div>
                        <Label>Min Personnel per Car</Label>
                        <Input
                            type="number"
                            min="1"
                            value={config.minPersonnelPerCar}
                            onChange={(e) => setConfig({ ...config, minPersonnelPerCar: parseInt(e.target.value) })}
                        />
                    </div>

                    <div>
                        <Label>Min Personnel per Bike</Label>
                        <Input
                            type="number"
                            min="1"
                            value={config.minPersonnelPerBike}
                            onChange={(e) => setConfig({ ...config, minPersonnelPerBike: parseInt(e.target.value) })}
                        />
                    </div>

                    <div>
                        <Label>Max Weekly Hours</Label>
                        <Input
                            type="number"
                            min="1"
                            value={config.maxWeeklyHours}
                            onChange={(e) => setConfig({ ...config, maxWeeklyHours: parseInt(e.target.value) })}
                        />
                    </div>

                    <div>
                        <Label>Min Weekly Hours</Label>
                        <Input
                            type="number"
                            min="1"
                            value={config.minWeeklyHours}
                            onChange={(e) => setConfig({ ...config, minWeeklyHours: parseInt(e.target.value) })}
                        />
                    </div>

                    <div>
                        <Label>Aggregation Window (hours)</Label>
                        <Input
                            type="number"
                            min="1"
                            max="4"
                            value={config.aggregationWindow}
                            onChange={(e) => setConfig({ ...config, aggregationWindow: parseInt(e.target.value) })}
                        />
                    </div>

                    <div>
                        <Label>Lookback Days</Label>
                        <Input
                            type="number"
                            min="30"
                            max="365"
                            value={config.lookbackDays}
                            onChange={(e) => setConfig({ ...config, lookbackDays: parseInt(e.target.value) })}
                        />
                    </div>

                    <div>
                        <Label>Night Shift Start Hour</Label>
                        <Input
                            type="number"
                            min="0"
                            max="23"
                            value={config.nightShiftStartHour}
                            onChange={(e) => setConfig({ ...config, nightShiftStartHour: parseInt(e.target.value) })}
                        />
                    </div>

                    <div>
                        <Label>Max Areas per Cluster</Label>
                        <Input
                            type="number"
                            min="1"
                            max="10"
                            value={config.maxAreasPerCluster}
                            onChange={(e) => setConfig({ ...config, maxAreasPerCluster: parseInt(e.target.value) })}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="allowNonPatrol"
                            checked={config.allowNonPatrolAtNight}
                            onChange={(e) => setConfig({ ...config, allowNonPatrolAtNight: e.target.checked })}
                            className="rounded"
                        />
                        <Label htmlFor="allowNonPatrol" className="cursor-pointer">Allow Non-Patrol at Night</Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={onSave} className="bg-brand hover:bg-brand/90 text-brand-foreground">
                        Save Configuration
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
