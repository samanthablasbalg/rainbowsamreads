import { render, screen, fireEvent } from '@testing-library/angular';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { ConfirmSheetComponent, ConfirmSheetData } from './confirm-sheet';

const baseData: ConfirmSheetData = {
  title: 'Delete Dune?',
  confirmLabel: 'Delete',
};

async function renderInDialog(dataOverrides: Partial<ConfirmSheetData> = {}) {
  const mockDialogRef = { close: vi.fn() };

  await render(ConfirmSheetComponent, {
    providers: [
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      { provide: MAT_DIALOG_DATA, useValue: { ...baseData, ...dataOverrides } },
      { provide: MatDialogRef, useValue: mockDialogRef },
    ],
  });

  return { mockDialogRef };
}

async function renderInBottomSheet(dataOverrides: Partial<ConfirmSheetData> = {}) {
  const mockBottomSheetRef = { dismiss: vi.fn() };

  await render(ConfirmSheetComponent, {
    providers: [
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      { provide: MAT_BOTTOM_SHEET_DATA, useValue: { ...baseData, ...dataOverrides } },
      { provide: MatBottomSheetRef, useValue: mockBottomSheetRef },
    ],
  });

  return { mockBottomSheetRef };
}

describe('ConfirmSheetComponent', () => {
  it('renders the title as a heading', async () => {
    await renderInDialog();
    expect(screen.getByRole('heading', { name: 'Delete Dune?' })).toBeTruthy();
  });

  it('renders the message when one is given', async () => {
    await renderInDialog({ message: "This can't be undone." });
    expect(screen.getByText("This can't be undone.")).toBeTruthy();
  });

  it('omits the message when none is given', async () => {
    await renderInDialog();
    expect(screen.queryByText("This can't be undone.")).toBeNull();
  });

  it('labels the confirm button from the data', async () => {
    await renderInDialog();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
  });

  it('defaults the cancel label to Cancel', async () => {
    await renderInDialog();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('uses a custom cancel label when given', async () => {
    await renderInDialog({ cancelLabel: 'Keep reading' });
    expect(screen.getByRole('button', { name: 'Keep reading' })).toBeTruthy();
  });

  it('closes the dialog with true when confirmed', async () => {
    const { mockDialogRef } = await renderInDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('closes the dialog with false when cancelled', async () => {
    const { mockDialogRef } = await renderInDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('dismisses the bottom sheet with true when confirmed', async () => {
    const { mockBottomSheetRef } = await renderInBottomSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(mockBottomSheetRef.dismiss).toHaveBeenCalledWith(true);
  });

  it('dismisses the bottom sheet with false when cancelled', async () => {
    const { mockBottomSheetRef } = await renderInBottomSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockBottomSheetRef.dismiss).toHaveBeenCalledWith(false);
  });

  it('gives the confirm button the warn color on the danger tone', async () => {
    await renderInDialog({ tone: 'danger' });
    expect(screen.getByRole('button', { name: 'Delete' }).classList).toContain('mat-warn');
  });

  it('gives the confirm button the primary color on the default tone', async () => {
    await renderInDialog();
    expect(screen.getByRole('button', { name: 'Delete' }).classList).toContain('mat-primary');
  });
});
