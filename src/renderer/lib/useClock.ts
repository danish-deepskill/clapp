import { useEffect, useState } from 'react';

/**
 * Wall-clock `Date` that re-renders once per minute, aligned to the minute
 * boundary so an HH:MM display never lags and nothing ticks in between.
 */
export function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      const n = new Date();
      const untilNextMinute =
        60_000 - (n.getSeconds() * 1000 + n.getMilliseconds()) + 50;
      timer = setTimeout(() => {
        setNow(new Date());
        arm();
      }, untilNextMinute);
    };
    arm();
    return () => clearTimeout(timer);
  }, []);
  return now;
}
