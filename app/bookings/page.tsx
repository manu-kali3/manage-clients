import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { loadBookingsData } from "@/lib/booking-data";
import AdminShell from "@/components/AdminShell";
import BookingsView from "@/components/BookingsView";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  if (!(await isAuthed())) {
    redirect("/login");
  }

  const { bookings, revenueByEvent, dbError } = await loadBookingsData();

  return (
    <AdminShell title="Bookings" subtitle="Ticket sales from the Brevan Events portal">
      <BookingsView
        initialBookings={bookings}
        initialRevenue={revenueByEvent}
        dbError={dbError}
      />
    </AdminShell>
  );
}
