"use client";

import React, { useState } from 'react';
import {
  Activity,
  GitBranch,
  RefreshCw,
  PlayCircle,
  ChevronRight,
  ChevronLeft,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ProcessNode } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProcessStepWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateStep: (step: Partial<ProcessNode>) => void;
  connectedToNodeId?: string;
}

export function ProcessStepWizard({
  open,
  onOpenChange,
  onCreateStep,
  connectedToNodeId
}: ProcessStepWizardProps) {
  const [step, setStep] = useState(0);
  const [stepType, setStepType] = useState<ProcessNode['type']>('step');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const steps = [
    { label: 'Typ', description: 'Wählen Sie die Art des Schritts' },
    { label: 'Basis', description: 'Grundinformationen' },
    { label: 'Details', description: 'Optionale Angaben' }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else handleCreate();
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    
    onCreateStep({
      type: stepType,
      title: title.trim(),
      description: description.trim(),
      checklist: [],
      resourceIds: [],
      featureIds: []
    });

    // Reset
    setStep(0);
    setStepType('step');
    setTitle('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">✨</span> Neuer Prozessschritt
          </DialogTitle>
          <DialogDescription>
            Schritt {step + 1} von {steps.length}: {steps[step].description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-6">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1 flex-1 rounded-full transition-all",
                idx <= step ? "bg-primary" : "bg-slate-200"
              )}
            />
          ))}
        </div>

        {/* Step 0: Type Selection */}
        {step === 0 && (
          <div className="space-y-4">
            <Label className="text-[9px] font-black uppercase text-slate-400">
              Schritt-Typ wählen
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: 'step' as const, label: 'Arbeitsschritt', icon: Activity, color: 'bg-slate-50 hover:bg-slate-100 text-slate-600' },
                { type: 'decision' as const, label: 'Entscheidung', icon: GitBranch, color: 'bg-amber-50 hover:bg-amber-100 text-amber-600' },
                { type: 'subprocess' as const, label: 'Referenz', icon: RefreshCw, color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600' },
                { type: 'start' as const, label: 'Startpunkt', icon: PlayCircle, color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600' }
              ].map(({ type, label, icon: Icon, color }) => (
                <button
                  key={type}
                  onClick={() => setStepType(type)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
                    stepType === type
                      ? 'border-primary bg-primary/5'
                      : `border-slate-200 ${color}`
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[9px] font-bold text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">
                Schritt-Name
              </Label>
              <Input
                placeholder="z.B. Anfrage entgegennehmen"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-lg"
                autoFocus
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-[9px] text-blue-700 font-medium">
                Der Name kann später immer noch bearbeitet werden.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Description */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">
                Beschreibung (optional)
              </Label>
              <Textarea
                placeholder="Beschreiben Sie die Tätigkeit..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-lg min-h-[100px]"
              />
            </div>

            <div className="text-[9px] text-slate-500">
              <p className="font-bold uppercase mb-1">Die Schritte 'Tipps', 'Fehler', 'Ressourcen' etc. können Sie später hinzufügen.</p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => {
              if (step > 0) setStep(step - 1);
              else onOpenChange(false);
            }}
            className="rounded-lg"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {step === 0 ? 'Abbrechen' : 'Zurück'}
          </Button>
          <Button
            onClick={handleNext}
            disabled={step === 1 && !title.trim()}
            className="rounded-lg gap-1"
          >
            {step === steps.length - 1 ? 'Erstellen' : 'Weiter'}
            {step < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
