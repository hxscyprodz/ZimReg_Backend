import { gte, eq, count, and } from "drizzle-orm";
import { db } from "../config/db";
import { addDays, isSaturday, isSunday } from "date-fns";
import { Schedules, Applications, Stations } from "../db/schemas";
import { config } from "../config/envConfig";
import { NotFoundError } from "../errors/errors";

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("T")[0]!.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
};

const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const validateDate = (date: string | Date): Date => {
  let weekDayDate =
    typeof date === "string" ? parseLocalDate(date) : new Date(date);

  if (isSaturday(weekDayDate)) {
    weekDayDate = addDays(weekDayDate, 2);
  } else if (isSunday(weekDayDate)) {
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
    date: newDate?.date,
  };
};

export const appointmentScheduler = async (stationId: string) => {
  const today = formatDateToString(new Date());

  const [isStationAvailable] = await db
    .select({ id: Stations.id })
    .from(Stations)
    .where(eq(Stations.id, stationId))
    .limit(1);

  if (!isStationAvailable) {
    throw new NotFoundError("Station doesn't exist");
  }

  const [allDates] = await db
    .select()
    .from(Schedules)
    .where(eq(Schedules.station, stationId))
    .limit(1);

  if (!allDates) {
    const addTwoDaysProvision = addDays(parseLocalDate(today), 2);
    const validDate = formatDateToString(validateDate(addTwoDaysProvision));

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
    .where(and(gte(Schedules.date, today), eq(Schedules.station, stationId)))
    .leftJoin(Applications, eq(Applications.appointmentDate, Schedules.id))
    .groupBy(Schedules.id)
    .orderBy(Schedules.date);

  if (availableDates.length < 1) {
    const validDate = formatDateToString(validateDate(today));
    return await createSchedule(validDate, stationId);
  }

  for (const date of availableDates) {
    if (date.applicationCount < date.capacity) {
      return {
        id: date.id,
        date: date.date,
      };
    }
  }

  const lastDateStr = availableDates.at(-1)?.date!;
  const nextDate = addDays(parseLocalDate(lastDateStr), 1);
  const validDate = formatDateToString(validateDate(nextDate));

  return await createSchedule(validDate, stationId);
};
