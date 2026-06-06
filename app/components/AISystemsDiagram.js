'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AppWindow,
  Bot,
  Code2,
  Landmark,
  MousePointer2,
  Settings,
  TerminalSquare,
  User,
  Users,
} from 'lucide-react';

const steps = [
  {
    title: '1. AI Development',
    text: 'The Development Team builds the AI model. The AI Tool begins its journey to the public agency.',
  },
  {
    title: '2. AI Procurement',
    text: 'The Public Agency procures the AI tool from the development team with contract conditions.',
  },
  {
    title: '3. Deployment & Integration',
    text: 'Agency Staff is trained to use the AI Tool for augmented workflows.',
  },
  {
    title: '4. Adoption in Public Service',
    text: 'Agency staff starts using the AI tool in decision making for the community contexts.',
  },
  {
    title: '5. The Missing Piece',
    text: 'AlgoStories gives the community a space to share how these systems affect real lives.',
  },
];

const TOOL_START = 16.66;
const STAFF_START = 50;
const STAGE_THREE = 66.66;
const STAGE_FOUR = 83.33;

function toolPosition(step) {
  if (step === 1) return 'left-[16.66%]';
  if (step === 2) return 'left-[50%]';
  if (step === 3) return 'left-[66.66%]';
  return 'left-[83.33%]';
}

function staffPosition(step) {
  if (step <= 2) return 'left-[50%]';
  if (step === 3) return 'left-[66.66%]';
  return 'left-[83.33%]';
}

function positionsForStep(step) {
  if (step === 1) return { tool: TOOL_START, staff: STAFF_START };
  if (step === 2) return { tool: STAFF_START, staff: STAFF_START };
  if (step === 3) return { tool: STAGE_THREE, staff: STAGE_THREE };
  return { tool: STAGE_FOUR, staff: STAGE_FOUR };
}

function nearestMovementStep(position) {
  if (position < 33.33) return 1;
  if (position < 58.33) return 2;
  if (position < 75) return 3;
  return 4;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function AISystemsDiagram() {
  const [step, setStep] = useState(1);
  const [toolX, setToolX] = useState(TOOL_START);
  const [staffX, setStaffX] = useState(STAFF_START);
  const [dragging, setDragging] = useState(null);
  const diagramRef = useRef(null);
  const positionsRef = useRef({ toolX: TOOL_START, staffX: STAFF_START, dragging: null });

  useEffect(() => {
    positionsRef.current = { toolX, staffX, dragging };
  }, [toolX, staffX, dragging]);

  function chooseStep(stepNum) {
    const positions = positionsForStep(stepNum);
    setStep(stepNum);
    setToolX(positions.tool);
    setStaffX(positions.staff);
  }

  function percentFromPointer(clientX) {
    const rect = diagramRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return ((clientX - rect.left) / rect.width) * 100;
  }

  function updateDrag(target, rawPercent) {
    if (rawPercent == null) return;
    if (target === 'tool') {
      const nextToolX = clamp(rawPercent, TOOL_START, STAGE_FOUR);
      if (nextToolX >= STAFF_START) {
        setToolX(nextToolX);
        setStaffX(nextToolX);
        setStep(nearestMovementStep(nextToolX));
      } else {
        setToolX(nextToolX);
        setStaffX(STAFF_START);
        setStep(nearestMovementStep(nextToolX));
      }
      return;
    }

    const nextStaffX = clamp(rawPercent, STAFF_START, STAGE_FOUR);
    setToolX(nextStaffX);
    setStaffX(nextStaffX);
    setStep(nearestMovementStep(nextStaffX));
  }

  function snapToNearestStep(target) {
    const current = positionsRef.current;
    const referencePosition = target === 'staff'
      ? clamp(current.staffX, STAFF_START, STAGE_FOUR)
      : current.toolX;
    const nextStep = nearestMovementStep(referencePosition);
    chooseStep(nextStep);
  }

  useEffect(() => {
    if (!dragging) return undefined;

    function onPointerMove(event) {
      event.preventDefault();
      updateDrag(dragging, percentFromPointer(event.clientX));
    }

    function onPointerUp() {
      snapToNearestStep(dragging);
      setDragging(null);
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [dragging]);

  return (
    <section className="border-b border-gray-100 bg-white py-10 md:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-6 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">A.I. Systems in Local Government</h2>
          <div className="mx-auto flex w-fit max-w-full items-center justify-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-sm font-medium text-gray-500 sm:px-4">
            <MousePointer2 className="h-4 w-4 shrink-0 animate-bounce" />
            <span className="leading-snug">Tap a step below to see how AI moves through government</span>
          </div>
        </div>

        <div className="relative overflow-x-auto rounded-xl border-2 border-gray-200 bg-white p-3 pb-5 shadow-lg sm:p-6 sm:pb-8">
          <div className="relative min-w-[760px] pt-4 sm:min-w-[900px]">
            <div ref={diagramRef} className="relative mb-4 h-44 w-full">
              <div className="absolute left-[16.66%] top-[25%] h-0 w-[66.66%] border-t-2 border-dashed border-gray-400" />
              <div className={`absolute left-[16.66%] top-[25%] -mt-1 h-2 w-2 -translate-x-1/2 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`absolute left-[50%] top-[25%] -mt-1 h-2 w-2 -translate-x-1/2 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-300'}`} />
              <div className={`absolute left-[83.33%] top-[25%] -mt-1 h-2 w-2 -translate-x-1/2 rounded-full ${step >= 4 && step !== 5 ? 'bg-emerald-500' : 'bg-gray-300'}`} />

              <div
                className={`absolute top-[25%] z-20 flex -translate-x-1/2 -translate-y-1/2 touch-none flex-col items-center ${dragging === 'tool' ? 'cursor-grabbing' : 'cursor-grab'} ${dragging ? '' : 'transition-all duration-700 ease-in-out'} ${toolPosition(step)}`}
                style={{ left: `${toolX}%` }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  setDragging('tool');
                }}
                role="button"
                tabIndex={0}
                aria-label="Drag AI Tool"
              >
                <div className={`mb-2 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${step === 5 ? 'border-gray-300 bg-gray-50 text-gray-400' : 'border-gray-800 bg-white shadow-sm text-gray-900'}`}>
                  AI TOOL
                </div>
                <div className={`relative rounded-md border-2 p-2 ${step === 5 ? 'border-gray-300 bg-gray-50' : step === 4 ? 'border-yellow-500 bg-white shadow-md shadow-yellow-200/50' : 'border-amber-500 bg-white shadow-md'}`}>
                  {step >= 4 ? (
                    <Bot className={`h-6 w-6 ${step === 5 ? 'text-gray-400' : 'text-yellow-600'}`} />
                  ) : (
                    <Code2 className="h-6 w-6 text-gray-800" />
                  )}
                  {step < 4 ? <Settings className="absolute -bottom-2 -right-2 h-4 w-4 animate-spin rounded-full bg-white text-gray-800" /> : null}
                </div>
              </div>

              <div className="absolute left-[16.66%] top-[75%] h-0 w-[66.66%] border-t-2 border-dashed border-gray-300" />
              <div className={`absolute left-[50%] top-[75%] -mt-1 h-2 w-2 -translate-x-1/2 rounded-full ${step >= 3 ? 'bg-indigo-500' : 'bg-gray-200'}`} />
              <div className={`absolute left-[83.33%] top-[75%] -mt-1 h-2 w-2 -translate-x-1/2 rounded-full ${step >= 4 && step !== 5 ? 'bg-emerald-500' : 'bg-gray-300'}`} />

              <div
                className={`absolute top-[75%] z-20 flex -translate-x-1/2 -translate-y-1/2 touch-none flex-col items-center ${dragging === 'staff' ? 'cursor-grabbing' : 'cursor-grab'} ${dragging ? '' : 'transition-all duration-700 ease-in-out'} ${staffPosition(step)}`}
                style={{ left: `${staffX}%` }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  setDragging('staff');
                }}
                role="button"
                tabIndex={0}
                aria-label="Drag Agency Staff"
              >
                <User className={`mb-2 h-10 w-10 ${step <= 2 || step === 5 ? 'text-gray-300' : 'text-gray-800'}`} />
                <div className={`whitespace-nowrap border-2 px-3 py-1 text-xs font-bold tracking-wider ${step <= 2 || step === 5 ? 'border-gray-300 bg-gray-50 text-gray-400' : 'border-gray-800 bg-white text-gray-800 shadow-md'}`}>
                  AGENCY STAFF
                </div>
              </div>
            </div>

            <div className="relative z-10 flex w-full border-t border-gray-100 pt-6">
              <div className="flex w-1/3 flex-col items-center">
                <div className={`relative flex h-20 items-center justify-center transition-all duration-500 ${step === 1 ? 'scale-110 drop-shadow-md' : 'opacity-70'}`}>
                  <Users className="h-20 w-20 text-blue-700" />
                  <TerminalSquare className="absolute -bottom-3 -right-5 h-11 w-11 rounded-full border-2 border-blue-600 bg-white p-1.5 text-blue-700" />
                </div>
                <div className={`mt-6 border-2 px-3 py-1.5 text-xs font-bold tracking-wider ${step === 1 ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md' : 'border-blue-300 bg-blue-50/50 text-blue-600'}`}>
                  DEVELOPMENT TEAM
                </div>
              </div>
              <div className="flex w-1/3 flex-col items-center">
                <div className={`flex h-20 items-center justify-center transition-all duration-500 ${step === 2 || step === 3 ? 'scale-110 drop-shadow-md' : 'opacity-70'}`}>
                  <Landmark className="h-20 w-20 text-indigo-700" />
                </div>
                <div className={`mt-6 border-2 px-3 py-1.5 text-xs font-bold tracking-wider ${step === 2 || step === 3 ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md' : 'border-indigo-300 bg-indigo-50/50 text-indigo-600'}`}>
                  PUBLIC AGENCY
                </div>
              </div>
              <div className="flex w-1/3 flex-col items-center">
                <div className={`relative flex h-20 items-end justify-center transition-all duration-500 ${step >= 4 ? 'scale-110 drop-shadow-md' : 'opacity-70'}`}>
                  <User className="z-10 -mr-3 mb-1 h-12 w-12 text-emerald-700" />
                  <User className="z-20 h-16 w-16 rounded-full bg-white text-emerald-700" />
                  <User className="z-10 -ml-3 mb-1 h-12 w-12 text-emerald-700" />
                  <div className={`absolute -top-8 z-30 flex items-center gap-1.5 rounded-full border-2 border-amber-600 bg-white px-3 py-1 text-amber-800 shadow-xl transition-all duration-500 ${step === 5 ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-90 opacity-0'}`}>
                    <AppWindow className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-bold tracking-wide">AlgoStories</span>
                  </div>
                </div>
                <div className={`z-20 mt-6 border-2 px-6 py-1.5 text-xs font-bold tracking-wider ${step >= 4 ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-md' : 'border-emerald-300 bg-emerald-50/50 text-emerald-600'}`}>
                  COMMUNITY
                </div>
              </div>
            </div>

            <div className="relative z-50 mt-8 grid grid-cols-5 gap-3 border-t border-gray-100 pt-6">
              {steps.map((content, index) => {
                const stepNum = index + 1;
                const active = step === stepNum;
                const missingPiece = stepNum === 5;
                return (
                  <button
                    key={content.title}
                    type="button"
                    onClick={() => chooseStep(stepNum)}
                    className={[
                      'relative min-h-[132px] rounded-xl border-2 p-3 text-left transition-all duration-300 sm:p-4',
                      active ? '-translate-y-2 scale-105 shadow-lg ring-2 ring-offset-2' : 'opacity-75 hover:opacity-100',
                      missingPiece ? 'border-gray-700 bg-gray-800 text-gray-300 hover:border-amber-400/60' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                      active && stepNum === 1 ? 'border-blue-400 bg-blue-50 text-blue-900 ring-blue-200' : '',
                      active && (stepNum === 2 || stepNum === 3) ? 'border-indigo-400 bg-indigo-50 text-indigo-900 ring-indigo-200' : '',
                      active && stepNum === 4 ? 'border-emerald-400 bg-emerald-50 text-emerald-900 ring-emerald-200' : '',
                      active && stepNum === 5 ? 'border-amber-400 bg-gray-900 text-amber-100 ring-amber-200' : '',
                    ].join(' ')}
                  >
                    {missingPiece ? (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-3 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-900">
                        What We Do
                      </span>
                    ) : null}
                    <h3 className="mb-2 text-[13px] font-bold leading-tight">{content.title}</h3>
                    <p className="text-[11px] leading-relaxed">{content.text}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
