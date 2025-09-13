import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MigrationsPage from "@/app/settings/migrations/page";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock supabase client auth and queries
jest.mock("@/app/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    from: jest.fn(() => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: "user-1", organization_id: "org-1" } }) })),
    storage: { from: jest.fn() },
  }),
}));

// Mock toast to avoid console noise
jest.mock("@/app/lib/toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

describe("Migrations upload interactions", () => {
  it("advances to step 2 when clicking to upload and selecting a file", async () => {
    render(<MigrationsPage />);

    // Click the button text
    const clickToUpload = await screen.findByText(/Click to upload/i);
    fireEvent.click(clickToUpload);

    // Find the hidden input via the dropzone container
    const dropzone = await screen.findByTestId("migrations-dropzone");
    const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(["a,b\n1,2"], "data.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Start AI Analysis/i)).toBeInTheDocument();
    });
  });

  it("advances to step 2 when a file is dropped", async () => {
    render(<MigrationsPage />);

    const dropzone = await screen.findByTestId("migrations-dropzone");
    const file = new File(["a,b\n1,2"], "data.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    const dataTransfer = {
      files: [file],
      types: ["Files"],
      getData: () => "",
      setData: () => {},
      dropEffect: "copy",
      effectAllowed: "all",
    } as unknown as DataTransfer;

    fireEvent.dragOver(dropzone, { dataTransfer });
    fireEvent.drop(dropzone, { dataTransfer });

    await waitFor(() => {
      expect(screen.getByText(/Start AI Analysis/i)).toBeInTheDocument();
    });
  });
});

