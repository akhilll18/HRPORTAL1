import React, { useState } from "react";
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { holidays } from "../../../data/peopleHubData.js";
import { readHolidayGreetings, writeHolidayGreetings } from "../../../data/holidayGreetings.js";
import { PageHeader, SectionCard } from "../../../components/kit/UI.jsx";

function holidayDateInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function HolidayGreetingSettings() {
  const [holidayName, setHolidayName] = useState(holidays[0]?.name || "");
  const [state, setState] = useState(readHolidayGreetings);
  const [holidayDate, setHolidayDate] = useState(holidayDateInput(holidays[0]?.date));
  const { greetings, error } = state;
  const selectedGreeting = greetings[holidayName];

  function selectHoliday(name) {
    setHolidayName(name);
    const savedDate = greetings[name]?.date;
    setHolidayDate(savedDate || holidayDateInput(holidays.find((holiday) => holiday.name === name)?.date));
  }

  function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setState((current) => ({ ...current, error: "Choose an image file." }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setState((current) => ({ ...current, error: "Greeting images are limited to 2 MB in this browser demo." }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setState((current) => ({ ...current, error: "The selected image could not be read." }));
        return;
      }
      const next = {
        ...greetings,
        [holidayName]: { name: file.name, image: reader.result, date: holidayDate },
      };
      try {
        writeHolidayGreetings(next);
        setState({ greetings: next, error: "" });
      } catch (saveError) {
        setState((current) => ({
          ...current,
          error: saveError instanceof Error ? saveError.message : "The greeting could not be saved.",
        }));
      }
    };
    reader.onerror = () => setState((current) => ({ ...current, error: "The selected image could not be read." }));
    reader.readAsDataURL(file);
  }

  function removeGreeting() {
    const next = { ...greetings };
    delete next[holidayName];
    try {
      writeHolidayGreetings(next);
      setState({ greetings: next, error: "" });
    } catch (saveError) {
      setState((current) => ({
        ...current,
        error: saveError instanceof Error ? saveError.message : "The greeting could not be removed.",
      }));
    }
  }

  function saveDate() {
    if (!selectedGreeting || !holidayDate) return;
    const next = { ...greetings, [holidayName]: { ...selectedGreeting, date: holidayDate } };
    try {
      writeHolidayGreetings(next);
      setState({ greetings: next, error: "" });
    } catch (saveError) {
      setState((current) => ({
        ...current,
        error: saveError instanceof Error ? saveError.message : "The holiday date could not be saved.",
      }));
    }
  }

  return (
    <>
      <PageHeader eyebrow="ADMIN · HOME SCREEN" title="Holiday greetings" subtitle="Upload a greeting image for a public holiday. It replaces the standard holiday card during the week before that holiday." />
      <SectionCard title="Greeting image" subtitle="Images are shared with employees in this browser demo.">
        <Stack spacing={2} sx={{ maxWidth: 720 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField select label="Public holiday" value={holidayName} onChange={(event) => selectHoliday(event.target.value)}>
            {holidays.map((holiday) => <MenuItem key={holiday.name} value={holiday.name}>{holiday.name} · {holiday.date}</MenuItem>)}
          </TextField>
          <TextField label="Holiday date" type="date" value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Button component="label" variant="contained" disabled={!holidayName || !holidayDate}>Upload greeting image<input hidden type="file" accept="image/*" onChange={upload} /></Button>
            {selectedGreeting && <Button color="primary" onClick={saveDate}>Save holiday date</Button>}
            {selectedGreeting && <Button color="inherit" onClick={removeGreeting}>Remove image</Button>}
          </Stack>
          {selectedGreeting ? (
            <Box>
              <Typography sx={{ mb: 1, fontSize: "0.7rem", color: "text.secondary" }}>{selectedGreeting.name} · shown to employees during the 7 days before {holidayName} on {selectedGreeting.date || holidayDate}</Typography>
              <Box component="img" src={selectedGreeting.image} alt={`${holidayName} greeting`} sx={{ display: "block", maxWidth: "100%", maxHeight: 360, borderRadius: 2, objectFit: "contain" }} />
            </Box>
          ) : (
            <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>No greeting uploaded for {holidayName || "this holiday"}.</Typography>
          )}
        </Stack>
      </SectionCard>
    </>
  );
}
