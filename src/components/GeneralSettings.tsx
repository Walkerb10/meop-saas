import { motion } from 'framer-motion';
import { useTimezone, TimeFormat } from '@/hooks/useTimezone';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function GeneralSettings() {
  const { timezone, setTimezone, timeFormat, setTimeFormat, timezones, getTimezoneAbbr } = useTimezone();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-lg font-semibold mb-2">General Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure your time and date preferences.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="font-medium mb-4">Time & Date Preferences</h3>
          
          {/* Timezone Setting */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone" className="w-full max-w-sm">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Current timezone: {getTimezoneAbbr()}
              </p>
            </div>

            {/* Time Format Setting */}
            <div className="space-y-2">
              <Label htmlFor="time-format">Time Format</Label>
              <Select value={timeFormat} onValueChange={(v) => setTimeFormat(v as TimeFormat)}>
                <SelectTrigger id="time-format" className="w-full max-w-sm">
                  <SelectValue placeholder="Select time format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour (9:00 AM)</SelectItem>
                  <SelectItem value="24h">24-hour (09:00)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How times are displayed throughout the app.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
