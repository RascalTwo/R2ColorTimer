import { CSSProperties, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Rnd, RndDragCallback } from 'react-rnd';

import styles from './ColorTimer.module.css';
import { calculateNearestHueRotation, colorToHex } from './hue-math';

const CYCLE_SECONDS = 60;

export const ConditionalWrapper = ({
  condition,
  wrapper,
  children,
}: {
  condition: boolean;
  wrapper: (children: React.ReactElement) => JSX.Element;
  children: React.ReactElement;
}) => (condition ? wrapper(children) : children);

const useTimer = (defaultDuration: number = 0) => {
  const interval = useRef<number | null>(null);

  const [duration, setDuration] = useState(defaultDuration);
  const [remaining, setRemaining] = useState(defaultDuration);
  const [running, setRunning] = useState(true);

  const decrementCounter = useCallback(() => {
    setRemaining(remaining => remaining - 1);
  }, [setRemaining]);

  useEffect(() => {
    if (running) {
      decrementCounter();
      interval.current = window.setInterval(decrementCounter, 1000);
    }
    return () => window.clearInterval(interval.current!);
  }, [running, decrementCounter]);

  const start = useCallback(
    (startDuration: number) => {
      setDuration(startDuration);
      setRemaining(startDuration);
      setRunning(true);
    },
    [setDuration, setRemaining, setRunning],
  );

  const toggle = useCallback(() => setRunning(running => !running), [setRunning]);

  return { duration, running, remaining, start, toggle };
};

export default function Timer({
  defaultFramed = false,
  defaultDuration = 0,
  defaultTitle = '',
  defaultDesc = '',
  countdownColors = '',
  children,
}: {
  defaultFramed?: boolean;
  defaultDuration?: number;
  defaultTitle?: string;
  defaultDesc?: string;
  countdownColors?: string;
  children?: JSX.Element;
  rest?: any;
}) {
  const [framed, setFramed] = useState(defaultFramed);
  const toggleFramed = () => {
    if (framed) {
      setPosition({ x: window.innerWidth / 2 - 50, y: window.innerHeight / 2 - 50 });
      setTimeout(() => {
        setPosition({ x: 0, y: 0 });
        setDimensions({ width: window.innerWidth + 'px', height: window.innerHeight + 'px' });
        setFramed(framed => !framed);
      }, 1500);
    } else {
      setFramed(framed => !framed);
      setDimensions({ width: 100 + 'px', height: 100 + 'px' });
      setPosition({ x: window.innerWidth / 2 - 50, y: window.innerHeight / 2 - 50 });
      setTimeout(() => setPosition({ x: 0, y: 0 }), 1500);
    }
  };

  const timer = useTimer(defaultDuration);
  const [title, setTitle] = useState(defaultTitle);
  const [desc, setDesc] = useState(defaultDesc);
  const [editing, setEditing] = useState(false);

  const [dimensions, setDimensions] = useState(
    framed
      ? { width: 100 + 'px', height: 100 + 'px' }
      : { width: window.innerWidth + 'px', height: window.innerHeight + 'px' },
  );
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const textStyle = useMemo(
    () => ({
      fontSize: framed ? parseInt(dimensions.width) * 0.33 + 'px' : '10vmin',
    }),
    [dimensions, framed],
  );

  const onRightClick = useCallback(
    (e: any) => {
      setEditing(true);
      timer.toggle();
      e.preventDefault();
    },
    [setEditing, timer],
  );

  const timerText = useMemo(() => {
    const remaining = Math.abs(timer.remaining);
    const minutes = Math.floor(remaining / 60);
    const seconds = (remaining % 60).toString().padStart(2, '0');
    return (timer.remaining < 0 ? '-' : '') + (minutes ? `${minutes.toString().padStart(2, '0')}:${seconds}` : seconds);
  }, [timer.remaining]);

  const onUpdate = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setEditing(false);
      const element = (e.target as HTMLFormElement).elements[0] as HTMLElement;
      if (element.tagName === 'INPUT') {
        timer.start(+(element as HTMLInputElement).value);
      } else if (element.tagName === 'TEXTAREA') {
        const { title, desc, duration } = JSON.parse((element as HTMLTextAreaElement).value);
        setTitle(title);
        setDesc(desc);
        timer.start(duration);
      }
    },
    [setEditing, timer],
  );

  const hueRotations = useMemo(() => {
    if (!countdownColors) return [0, 180];

    if (!countdownColors.includes(' ')) {
      const one = calculateNearestHueRotation('#33bdf4', colorToHex(countdownColors));
      return [one, (one + 180) % 360];
    }
    return countdownColors.split(' ').map(color => calculateNearestHueRotation('#33bdf4', colorToHex(color)));
  }, [countdownColors]);

  const key = useMemo(
    () => (timer.remaining > 0 ? timer.duration : Math.floor(timer.remaining / CYCLE_SECONDS)),
    [timer.duration, timer.remaining],
  );

  return (
    <Rnd
      position={position}
      onDragStop={useCallback<RndDragCallback>((_, data) => setPosition({ x: data.x, y: data.y }), [setPosition])}
      className={styles.timer}
      size={dimensions}
      onResizeStop={useCallback(
        (_: any, __: any, ref: HTMLElement) => setDimensions({ width: ref.style.width, height: ref.style.height }),
        [setDimensions],
      )}
      minHeight={100}
      minWidth={100}
      data-framed={framed}
      disableDragging={!framed}
      enableResizing={framed}
    >
      <>
        <div
          className={styles.timer}
          style={
            {
              '--hue-rotate': hueRotations[0] + 'deg',
              '--hue-rotate-opposite': hueRotations[1] + 'deg',
            } as CSSProperties
          }
        >
          <img src="/header-high.png" alt="" />
          <img
            src="/header-high.png"
            className={styles.progress}
            style={useMemo(
              () => ({
                animationName: styles.progress,
                animationDuration: (timer.remaining > 0 ? timer.duration - 1 : CYCLE_SECONDS) + 's',
                animationTimingFunction: 'linear',
                animationPlayState: timer.running ? 'running' : 'paused',
                animationDirection: timer.remaining > 0 ? 'normal' : ['normal', 'reverse'][Math.abs(key % 2)],
              }),
              [key, timer.duration, timer.remaining, timer.running],
            )}
            key={key}
            alt=""
          />
          <h2>{title}</h2>
          {editing ? (
            <form onSubmit={onUpdate}>
              {framed ? (
                <input
                  defaultValue={timer.remaining}
                  autoFocus
                  onClick={({ target }) => (target as HTMLInputElement).select()}
                />
              ) : (
                <>
                  <textarea
                    defaultValue={JSON.stringify({ duration: timer.remaining, title, desc }, null, '  ')}
                    autoFocus
                    rows={5}
                  />
                  <br />
                  <button>Submit</button>
                </>
              )}
            </form>
          ) : (
            <h1 style={textStyle} onClick={timer.toggle} onDoubleClick={toggleFramed} onContextMenu={onRightClick}>
              {timerText}
            </h1>
          )}
          <p dangerouslySetInnerHTML={{ __html: desc.replace(/\n/g, '<br/>') }}></p>
        </div>
        {framed ? null : children}
      </>
    </Rnd>
  );
}
