const validDay=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
export function applyReadingTime(previous,input){const state={readingLog:{...previous?.readingLog},lifetimeSeconds:Number(previous?.lifetimeSeconds)||0,receipts:[...(previous?.receipts||[])]};
 if(input.action==='load')return state;if(!/^[a-zA-Z0-9_-]{8,100}$/.test(input.id||''))throw Error('Invalid reading receipt');if(state.receipts.includes(input.id))return state;
 if(input.action==='add'){const days=Object.entries(input.days||{});if(!days.length||days.length>7||days.some(([day,seconds])=>!validDay(day)||!Number.isInteger(seconds)||seconds<0||seconds>120))throw Error('Invalid reading duration');for(const [day,seconds] of days){state.readingLog[day]=(Number(state.readingLog[day])||0)+seconds;state.lifetimeSeconds+=seconds;}}
 else if(input.action==='reset'){if(!validDay(input.day))throw Error('Invalid reading day');state.readingLog[input.day]=0;}
 else throw Error('Unknown reading operation');state.receipts.push(input.id);state.receipts=state.receipts.slice(-1000);return state;
}
