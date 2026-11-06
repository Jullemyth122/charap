import { Component, input, output, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../app-icon';
import { Recipe, Ingredient, NutrientDetails } from '../../chef.service';

export interface NutrientBadge {
  label: string;
  value: string;
  kind: 'macro' | 'vit' | 'mineral';
}

export interface CompactChip {
  prefix: string;
  value: string;
}

export interface StatCard {
  label: string;
  value: string;
  wide?: boolean;
  highlight?: boolean;
}

export interface ElementTile {
  symbol: string;
  name: string;
  amount?: string;
  note?: string;
}

@Component({
  selector: 'app-recipe-modal',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './recipe_modal.component.html',
  styleUrl: './recipe_modal.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class RecipeModalComponent {
  readonly recipe = input.required<Recipe>();
  readonly isDarkMode = input.required<boolean>();
  readonly close = output<void>();

  protected readonly currentStepIndex = signal<number>(0);
  protected readonly checkedIngredients = signal<Record<string, boolean>>({});
  protected readonly expandedIngredientIndex = signal<number | null>(null);
  protected readonly isTotalNutritionExpanded = signal<boolean>(false);
  protected readonly activeNutritionTab = signal<'macros' | 'vitamins' | 'minerals' | 'elemental'>(
    'macros',
  );

  /** Pure code logic: format nutrient keys dynamically (e.g., 'vitaminB12' -> 'Vitamin B12') */
  private formatNutrientLabel(key: string): string {
    if (key.toLowerCase() === 'water') return 'Hydration (Water Content)';
    if (/^vitamin/i.test(key)) {
      return key
        .replace(/^vitamin/i, 'Vitamin ')
        .replace(/([0-9]+)/, ' $1')
        .trim();
    }
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }

  /** Pure code logic: categorize nutrient dynamically without hardcoded tables */
  private getNutrientKind(key: string): 'macro' | 'vit' | 'mineral' | 'skip' {
    const k = key.toLowerCase();
    if (['elements', 'phytochemicals', 'notes', 'substitutions'].includes(k)) return 'skip';
    if (['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'water'].includes(k))
      return 'macro';
    if (
      k.startsWith('vit') ||
      k.includes('folate') ||
      k.includes('thiamin') ||
      k.includes('riboflavin') ||
      k.includes('niacin')
    ) {
      return 'vit';
    }
    return 'mineral';
  }

  /** Compact P/C/F/K chips on collapsed ingredient row */
  protected getCompactChips(n: NutrientDetails): CompactChip[] {
    const chips: CompactChip[] = [];
    if (n.protein) chips.push({ prefix: 'P', value: n.protein });
    if (n.carbs) chips.push({ prefix: 'C', value: n.carbs });
    if (n.fat) chips.push({ prefix: 'F', value: n.fat });
    // if (n.potassium) chips.push({ prefix: 'K', value: n.potassium });
    return chips;
  }

  /** Dynamic drawer badges for ingredient breakdown - pure code logic */
  protected getDrawerMacros(n: NutrientDetails): NutrientBadge[] {
    return this.getDrawerBadges(n, 'macro');
  }

  protected getDrawerVitamins(n: NutrientDetails): NutrientBadge[] {
    return this.getDrawerBadges(n, 'vit');
  }

  protected getDrawerMinerals(n: NutrientDetails): NutrientBadge[] {
    return this.getDrawerBadges(n, 'mineral');
  }

  private getDrawerBadges(
    n: NutrientDetails,
    targetKind: 'macro' | 'vit' | 'mineral',
  ): NutrientBadge[] {
    return Object.entries(n)
      .filter(
        ([key, val]) =>
          typeof val === 'string' && val.trim() !== '' && this.getNutrientKind(key) === targetKind,
      )
      .map(([key, val]) => ({
        label: this.formatNutrientLabel(key),
        value: String(val),
        kind: targetKind,
      }));
  }

  /** Dynamic Tab Stats for Total Dish Nutrition - pure code logic */
  protected getTabStats(tab: 'macros' | 'vitamins' | 'minerals', n: NutrientDetails): StatCard[] {
    return Object.entries(n)
      .filter(([key, val]) => {
        if (typeof val !== 'string' || !val.trim()) return false;
        const kind = this.getNutrientKind(key);
        if (tab === 'macros') {
          return ['fiber', 'sugar', 'water'].includes(key.toLowerCase());
        }
        return kind === (tab === 'vitamins' ? 'vit' : 'mineral');
      })
      .map(([key, val]) => ({
        label: this.formatNutrientLabel(key),
        value: String(val),
        wide: key.toLowerCase() === 'water',
        highlight: key.toLowerCase() === 'water',
      }));
  }

  /** Dynamic Chemistry / Periodic Element tiles directly from AI response */
  protected getElementTiles(
    n: NutrientDetails,
    potassium?: string,
    sodium?: string,
  ): ElementTile[] {
    if (n.elements?.length) {
      return n.elements.map((e) => ({
        symbol: e.symbol || e.element.slice(0, 2),
        name: e.element,
        amount: e.amount,
        note: e.note,
      }));
    }
    return [];
  }

  protected toggleIngredient(ing: string) {
    this.checkedIngredients.update((checked) => ({ ...checked, [ing]: !checked[ing] }));
  }

  protected toggleIngredientNutrients(index: number, event?: MouseEvent) {
    event?.stopPropagation();
    this.expandedIngredientIndex.update((idx) => (idx === index ? null : index));
  }

  protected getCheckedCount(): number {
    const checked = this.checkedIngredients();
    return this.recipe().ingredients.filter((ing) => checked[ing.name]).length;
  }

  protected toggleTotalNutrition() {
    this.isTotalNutritionExpanded.update((v) => !v);
  }

  protected setActiveNutritionTab(tab: 'macros' | 'vitamins' | 'minerals' | 'elemental') {
    this.activeNutritionTab.set(tab);
  }

  protected prevStep() {
    const idx = this.currentStepIndex();
    if (idx > 0) this.currentStepIndex.set(idx - 1);
  }

  protected nextStep() {
    const idx = this.currentStepIndex();
    const len = this.recipe().steps.length;
    if (idx < len - 1) this.currentStepIndex.set(idx + 1);
  }

  protected goToStep(index: number) {
    const len = this.recipe().steps.length;
    if (index >= 0 && index < len) this.currentStepIndex.set(index);
  }

  protected handleClose() {
    this.close.emit();
  }

  protected handleBackdropClick() {
    this.close.emit();
  }
}
