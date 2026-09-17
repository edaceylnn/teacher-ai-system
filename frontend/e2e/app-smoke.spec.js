import { expect, test } from "@playwright/test";

test("demo admin can log in and sees the teacher dashboard", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /Giriş Yap/ }).click();

  await expect(page.getByRole("heading", { name: "Kontrol Paneli" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Öğrencilerim/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Kazanımlar/ })).toHaveCount(0);
});

test("student table bulk select lives in the table header", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Giriş Yap/ }).click();
  await page.getByRole("button", { name: /Öğrencilerim/ }).click();

  const table = page.locator(".students-table");
  await expect(table).toBeVisible();
  await expect(table.locator("thead input[type='checkbox']")).toHaveCount(1);
  await expect(page.getByText("Görünen yönetilebilir öğrencileri seç")).toHaveCount(0);
});
