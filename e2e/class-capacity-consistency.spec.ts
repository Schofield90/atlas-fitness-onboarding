import { test, expect } from "@playwright/test";

test.describe("Class Type Capacity Consistency", () => {
  test("default capacity should be consistent between list and edit views", async ({
    page,
  }) => {
    // Navigate to classes page
    await page.goto("/classes");

    // Wait for page to load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Check if there are any class types
    const noClassTypes = await page
      .locator("text=/No class types/i")
      .isVisible()
      .catch(() => false);

    let testCapacityValue: string;

    if (noClassTypes) {
      console.log("No class types found, creating one for testing");

      // Click Add Class Type button
      const addButton = page.locator("button:has-text('Add Class Type')");
      await expect(addButton).toBeVisible();
      await addButton.click();

      // Wait for modal
      await page.waitForTimeout(1000);

      // Fill in the form
      await page.fill('input[id="name"]', "Test Capacity Class");
      await page.fill("textarea", "Test class for capacity consistency");

      // Set a specific capacity value
      testCapacityValue = "25";
      const capacityInput = page.locator('input[type="number"]').first();
      await capacityInput.fill(testCapacityValue);

      // Submit the form
      await page.click('button:has-text("Create Class Type")');
      await page.waitForTimeout(2000);

      // Refresh the page to ensure we're loading from database
      await page.reload();
      await page.waitForLoadState("networkidle");
    }

    // Now check the list view
    const classRows = page.locator("tbody tr");
    const rowCount = await classRows.count();

    if (rowCount > 0) {
      // Get the first class type's capacity from the list view
      const firstRow = classRows.first();
      const capacityCell = firstRow.locator("td").nth(4); // Default Capacity column
      const listCapacity = await capacityCell.textContent();
      console.log(`List view capacity: ${listCapacity}`);

      // Click edit on the first class type
      const editButton = firstRow.locator('button:has(svg[class*="Edit"])');
      await editButton.click();

      // Wait for navigation to edit page
      await page.waitForURL(/\/classes\/[a-z0-9-]+/);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Get the capacity value from the edit form
      const editCapacityInput = page.locator('input[type="number"]').first();
      const editCapacity = await editCapacityInput.inputValue();
      console.log(`Edit form capacity: ${editCapacity}`);

      // Extract numeric values for comparison
      const listCapacityNum = listCapacity?.replace(/\D/g, "") || "0";
      const editCapacityNum = editCapacity || "0";

      // Verify they match
      expect(editCapacityNum).toBe(listCapacityNum);
      console.log(
        `✅ Capacity values match: ${editCapacityNum} === ${listCapacityNum}`,
      );

      // Test updating the capacity
      const newCapacity = "30";
      await editCapacityInput.fill(newCapacity);

      // Check for capacity update options
      const updateOptionsExist = await page
        .locator("text=/Apply Capacity Changes To:/i")
        .isVisible()
        .catch(() => false);

      if (updateOptionsExist) {
        // Select to update all existing sessions
        const allSessionsCheckbox = page
          .locator('input[type="checkbox"]')
          .last();
        if (await allSessionsCheckbox.isVisible()) {
          await allSessionsCheckbox.check();
        }
      }

      // Save changes
      const saveButton = page.locator('button:has-text("Save Changes")');
      await expect(saveButton).toBeVisible();
      await saveButton.click();

      // Wait for save to complete
      await page.waitForTimeout(2000);

      // Navigate back to list
      await page.goto("/classes");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Verify the capacity was updated in the list
      const updatedCapacityCell = page
        .locator("tbody tr")
        .first()
        .locator("td")
        .nth(4);
      const updatedListCapacity = await updatedCapacityCell.textContent();
      const updatedListCapacityNum =
        updatedListCapacity?.replace(/\D/g, "") || "0";

      expect(updatedListCapacityNum).toBe(newCapacity);
      console.log(
        `✅ Capacity successfully updated to ${newCapacity} in list view`,
      );
    } else {
      console.log("No class types found to test");
    }
  });

  test("capacity should sync between create modal and list view", async ({
    page,
  }) => {
    // Navigate to classes page
    await page.goto("/classes");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Click Add Class Type button
    const addButton = page.locator("button:has-text('Add Class Type')");
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Wait for modal
    await page.waitForTimeout(1000);

    // Fill in the form with a specific capacity
    const testCapacity = "15";
    await page.fill('input[id="name"]', `Capacity Test ${Date.now()}`);
    await page.fill("textarea", "Testing capacity sync");

    // Set capacity
    const capacityInput = page.locator('input[type="number"]').first();
    await capacityInput.fill(testCapacity);

    // Submit the form
    await page.click('button:has-text("Create Class Type")');
    await page.waitForTimeout(2000);

    // Check the list view for the new class
    const newClassRow = page.locator("tbody tr").first();
    const capacityCell = newClassRow.locator("td").nth(4);
    const displayedCapacity = await capacityCell.textContent();
    const displayedCapacityNum = displayedCapacity?.replace(/\D/g, "") || "0";

    expect(displayedCapacityNum).toBe(testCapacity);
    console.log(
      `✅ New class created with capacity ${testCapacity} displayed correctly`,
    );
  });
});
