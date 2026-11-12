import { useState, useEffect } from 'react';

export function useClock() {
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Ejemplo de formato: "MIÉRCOLES 11 NOVIEMBRE   10:02 p. m."
      const dayName = now.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
      const dayNum = now.getDate();
      const monthName = now.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();
      
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
      hours = hours % 12;
      hours = hours ? hours : 12; // La hora '0' debe ser '12'
      const hoursStr = hours.toString().padStart(2, '0');

      setTimeString(`${dayName} ${dayNum} ${monthName}   ${hoursStr}:${minutes} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return timeString;
}
