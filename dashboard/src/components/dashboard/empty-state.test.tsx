import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/dashboard/empty-state";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <EmptyState
        title="No orders found"
        description="Create an order to get started."
      />
    );

    expect(screen.getByText("No orders found")).toBeInTheDocument();
    expect(
      screen.getByText("Create an order to get started.")
    ).toBeInTheDocument();
  });
});
