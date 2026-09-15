import { gte, eq, count } from "drizzle-orm";
import { db } from "../config/db";
import { addDays, isSaturday, isSunday, parseISO } from "date-fns";
import { Schedules, Applications } from "../db/schemas";
import { config } from "../config/envConfig";

const validateDate = (date: string | Date) => {
  let weekDayDate = typeof date === "string" ? parseISO(date) : new Date(date);
  if (isSaturday(weekDayDate)) {
    weekDayDate = addDays(weekDayDate, 2);
  }

  if (isSunday(weekDayDate)) {
    weekDayDate = addDays(weekDayDate, 1);
  }

  return weekDayDate;
};

const createSchedule = async (date: string, stationId: string) => {
  const [newDate] = await db
    .insert(Schedules)
    .values({
      date,
      capacity: config.DAY_APPOINTMENT_CAPACITY,
      station: stationId,
    })
    .returning({
      id: Schedules.id,
      date: Schedules.date,
    });

  return {
    id: newDate?.id,
  };
};

export const appointmentScheduler = async (stationId: string) => {
  const today = new Date().toISOString().split("T")[0]!;

  const allDates = await db.select().from(Schedules);

  if (allDates.length < 1) {
    const addTwoDaysProvision = addDays(today, 2).toISOString().split("T")[0]!;
    const validDate = validateDate(addTwoDaysProvision)
      .toISOString()
      .split("T")[0]!;

    return await createSchedule(validDate, stationId);
  }

  const availableDates = await db
    .select({
      id: Schedules.id,
      date: Schedules.date,
      capacity: Schedules.capacity,
      applicationCount: count(Applications.id),
    })
    .from(Schedules)
    .where(gte(Schedules.date, today))
    .leftJoin(Applications, eq(Applications.appointmentDate, Schedules.id))
    .groupBy(Schedules.id)
    .orderBy(Schedules.date);

  if (availableDates.length < 1) {
    const validDate = validateDate(today).toISOString().split("T")[0]!;
    return await createSchedule(validDate, stationId);
  }

  for (const date of availableDates) {
    if (date.applicationCount < date.capacity) {
      return {
        id: date.id,
      };
    }
  }

  const lastDateStr = availableDates.at(-1)?.date!;
  const nextDate = addDays(parseISO(lastDateStr), 1);
  const validDate = validateDate(nextDate).toISOString().split("T")[0]!;

  return await createSchedule(validDate, stationId);
};
