import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ErrorState } from "@/components/dashboard/error-state";
import { ApiError } from "@/lib/api-error";

describe("ErrorState", () => {
  it("shows API error message and retries", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(
      <ErrorState
        error={new ApiError(500, "Gateway unavailable")}
        onRetry={onRetry}
        title="Unable to load"
      />
    );

    expect(screen.getByText("Unable to load")).toBeInTheDocument();
    expect(screen.getByText("Gateway unavailable")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
