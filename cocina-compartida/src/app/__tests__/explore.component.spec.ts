import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { Explore } from '../features/pages/explore/explore';
import { RecipeService } from '../shared/services/recipe';
import { Auth } from '../shared/services/auth';
import { Router, provideRouter } from '@angular/router';
import { SearchService } from '../shared/services/search.service';
import { Recipe } from '../shared/interfaces/recipe';
import Swal from 'sweetalert2';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  EXPLORE COMPONENT – Pruebas Unitarias (Patrón AAA)
//  Funcionalidad: Explorar recetas, paginación, likes, búsqueda
//
//  Tipos de Mocks usados:
//  1. Spy      – jasmine.createSpy para verificar llamadas
//  2. Stub     – Retornos fijos hardcodeados
//  3. Mock     – Objetos completos con comportamiento simulado
//  4. Dummy    – Datos de prueba sin lógica
//  5. Fake     – Implementaciones simplificadas (signal fakes)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// --- Dummy Data ---
const DUMMY_RECIPE: Recipe = {
  id: 'r1', name: 'Paella', descripcion: 'Arroz con mariscos',
  ingredients: ['arroz', 'mariscos'], steps: ['cocinar'],
  images: ['img1.png'], category: 'Española',
  user: { id: 'u1', username: 'chef1' },
  likes: 10, likedBy: ['u2'], comments: []
};

const DUMMY_RECIPES: Recipe[] = Array.from({ length: 12 }, (_, i) => ({
  ...DUMMY_RECIPE,
  id: `r${i + 1}`,
  name: `Receta ${i + 1}`,
  likes: i * 5,
  likedBy: i % 2 === 0 ? ['u1'] : []
}));

describe('Explore Component – Pruebas Unitarias', () => {
  let component: Explore;
  let mockRecipeService: any;
  let mockAuthService: any;
  let mockRouter: any;
  let mockSearchService: any;

  // --- Fake signal helper ---
  function fakeSignal<T>(initialValue: T) {
    let value = initialValue;
    const fn = () => value;
    fn.set = (v: T) => { value = v; };
    fn.update = (updater: (v: T) => T) => { value = updater(value); };
    fn.asReadonly = () => fn;
    return fn;
  }

  beforeEach(() => {
    // Test Double (Fake): Señales simuladas para RecipeService
    const recipesSignal = fakeSignal<Recipe[]>(DUMMY_RECIPES);

    // Test Double (Mock): RecipeService con spy y señales fake
    mockRecipeService = {
      recipes: recipesSignal,
      toggleLike: jasmine.createSpy('toggleLike').and.returnValue(Promise.resolve()),
      getRecipeById: jasmine.createSpy('getRecipeById'),
      loadRecipes: jasmine.createSpy('loadRecipes')
    };

    // Test Double (Stub): Auth con retornos fijos
    mockAuthService = {
      isLoged: jasmine.createSpy('isLoged').and.returnValue(true),
      getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue({ id: 'u1', username: 'testuser' }),
      getUserProfile: jasmine.createSpy('getUserProfile').and.returnValue({ id: 'u1', username: 'testuser' })
    };

    // Test Double (Spy): Router
    mockRouter = { navigate: jasmine.createSpy('navigate') };

    // Test Double (Fake): SearchService con señales fake
    const searchResultsSignal = fakeSignal<Recipe[]>([]);
    mockSearchService = {
      results: searchResultsSignal,
      suggestions: fakeSignal<Recipe[]>([]),
      currentSort: fakeSignal('recent'),
      currentQuery: fakeSignal(''),
      currentCategory: fakeSignal('todas'),
      search: jasmine.createSpy('search'),
      clearFilters: jasmine.createSpy('clearFilters'),
      filterByCategory: jasmine.createSpy('filterByCategory'),
      setSortOption: jasmine.createSpy('setSortOption')
    };

    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: false } as any));

    TestBed.configureTestingModule({
      imports: [Explore],
      providers: [
        provideRouter([]),
        { provide: RecipeService, useValue: mockRecipeService },
        { provide: Auth, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: SearchService, useValue: mockSearchService }
      ]
    });

    const fixture = TestBed.createComponent(Explore);
    component = fixture.componentInstance;
  });

  // ──────────────────────────────────────────────────────────
  //  EXP-01: allRecipes devuelve recetas del servicio cuando no hay búsqueda
  // ──────────────────────────────────────────────────────────
  describe('allRecipes computed signal', () => {
    it('EXP-01: retorna recetas del RecipeService cuando searchResults está vacío (Stub)', () => {
      // Arrange
      mockSearchService.results = fakeSignal<Recipe[]>([]);

      // Act
      const result = component.allRecipes();

      // Assert
      expect(result.length).toBe(12);
      expect(result[0].id).toBe('r1');
    });

    it('EXP-02: retorna searchResults cuando hay resultados de búsqueda (Mock)', () => {
      // Arrange
      const searchResults = [DUMMY_RECIPES[0], DUMMY_RECIPES[1]];
      mockSearchService.results = fakeSignal<Recipe[]>(searchResults);

      // Re-create component with new search service
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [Explore],
        providers: [
          provideRouter([]),
          { provide: RecipeService, useValue: mockRecipeService },
          { provide: Auth, useValue: mockAuthService },
          { provide: Router, useValue: mockRouter },
          { provide: SearchService, useValue: mockSearchService }
        ]
      });
      const fixture = TestBed.createComponent(Explore);
      const comp = fixture.componentInstance;

      // Act
      const result = comp.allRecipes();

      // Assert
      expect(result.length).toBe(2);
    });
  });

  // ──────────────────────────────────────────────────────────
  //  EXP-03 a EXP-05: Paginación (recipesToShow / loadMore)
  // ──────────────────────────────────────────────────────────
  describe('Paginación', () => {
    it('EXP-03: recipesToShow inicialmente muestra 6 recetas (Dummy data)', () => {
      // Arrange - ya configurado con 12 recetas

      // Act
      const visible = component.recipesToShow();

      // Assert
      expect(visible.length).toBe(6);
    });

    it('EXP-04: visibleRecipeCount inicia en 6 (recipesPerPage)', () => {
      // Arrange - componente recién creado

      // Act
      const count = component.visibleRecipeCount();

      // Assert
      expect(count).toBe(6);
    });

    it('EXP-05: isLoading inicia como false', () => {
      // Arrange - componente recién creado

      // Act
      const loading = component.isLoading();

      // Assert
      expect(loading).toBe(false);
    });
  });

  describe('Sorpréndeme', () => {
    it('navega al detalle de una receta disponible', () => {
      component.surpriseMe();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/recipe', jasmine.any(String)]);
    });

    it('no navega cuando no hay recetas disponibles', () => {
      mockRecipeService.recipes = fakeSignal<Recipe[]>([]);
      mockSearchService.results = fakeSignal<Recipe[]>([]);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [Explore],
        providers: [
          provideRouter([]),
          { provide: RecipeService, useValue: mockRecipeService },
          { provide: Auth, useValue: mockAuthService },
          { provide: Router, useValue: mockRouter },
          { provide: SearchService, useValue: mockSearchService }
        ]
      });
      const fixture = TestBed.createComponent(Explore);

      fixture.componentInstance.surpriseMe();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────
  //  EXP-06 a EXP-09: toggleLike
  // ──────────────────────────────────────────────────────────
  describe('toggleLike', () => {
    it('EXP-06: llama recipeService.toggleLike cuando el usuario está logueado (Spy)', () => {
      // Arrange
      mockAuthService.isLoged.and.returnValue(true);

      // Act
      component.toggleLike('r1');

      // Assert
      expect(mockRecipeService.toggleLike).toHaveBeenCalledWith('r1');
    });

    it('EXP-07: muestra alerta cuando el usuario NO está logueado (Stub + Mock Swal)', () => {
      // Arrange
      mockAuthService.isLoged.and.returnValue(false);

      // Act
      component.toggleLike('r1');

      // Assert
      expect(mockRecipeService.toggleLike).not.toHaveBeenCalled();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
        title: '¡Necesitas iniciar sesión!'
      }));
    });

    it('EXP-08: navega a /login cuando el usuario confirma la alerta (Spy + Mock Swal)', async () => {
      // Arrange
      mockAuthService.isLoged.and.returnValue(false);
      (Swal.fire as jasmine.Spy).and.returnValue(Promise.resolve({ isConfirmed: true } as any));

      // Act
      component.toggleLike('r1');
      await Promise.resolve(); // esperar microtask de Swal

      // Assert
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('EXP-09: NO navega a /login cuando el usuario cancela la alerta', async () => {
      // Arrange
      mockAuthService.isLoged.and.returnValue(false);
      (Swal.fire as jasmine.Spy).and.returnValue(Promise.resolve({ isConfirmed: false } as any));

      // Act
      component.toggleLike('r1');
      await Promise.resolve();

      // Assert
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────
  //  EXP-10 a EXP-13: hasLiked
  // ──────────────────────────────────────────────────────────
  describe('hasLiked', () => {
    it('EXP-10: retorna true si el usuario actual está en likedBy (Stub)', () => {
      // Arrange
      mockAuthService.isLoged.and.returnValue(true);
      mockAuthService.getCurrentUser.and.returnValue({ id: 'u2' });
      const recipe = { ...DUMMY_RECIPE, likedBy: ['u2', 'u3'] };

      // Act
      const result = component.hasLiked(recipe);

      // Assert
      expect(result).toBeTrue();
    });

    it('EXP-11: retorna false si el usuario actual NO está en likedBy', () => {
      // Arrange
      mockAuthService.isLoged.and.returnValue(true);
      mockAuthService.getCurrentUser.and.returnValue({ id: 'u99' });
      const recipe = { ...DUMMY_RECIPE, likedBy: ['u2', 'u3'] };

      // Act
      const result = component.hasLiked(recipe);

      // Assert
      expect(result).toBeFalse();
    });

    it('EXP-12: retorna false si el usuario no está logueado (Stub)', () => {
      // Arrange
      mockAuthService.isLoged.and.returnValue(false);

      // Act
      const result = component.hasLiked(DUMMY_RECIPE);

      // Assert
      expect(result).toBeFalse();
    });

    it('EXP-13: retorna false si getCurrentUser retorna null', () => {
      // Arrange
      mockAuthService.isLoged.and.returnValue(true);
      mockAuthService.getCurrentUser.and.returnValue(null);

      // Act
      const result = component.hasLiked(DUMMY_RECIPE);

      // Assert
      expect(result).toBeFalse();
    });

    it('EXP-14: retorna false si likedBy es undefined', () => {
      // Arrange
      mockAuthService.isLoged.and.returnValue(true);
      mockAuthService.getCurrentUser.and.returnValue({ id: 'u1' });
      const recipe = { ...DUMMY_RECIPE, likedBy: undefined };

      // Act
      const result = component.hasLiked(recipe as any);

      // Assert
      expect(result).toBeFalse();
    });
  });

  // ──────────────────────────────────────────────────────────
  //  EXP-15 a EXP-16: clearSearch
  // ──────────────────────────────────────────────────────────
  describe('clearSearch', () => {
    it('EXP-15: llama searchService.clearFilters (Spy)', () => {
      // Arrange - servicio ya inyectado

      // Act
      component.clearSearch();

      // Assert
      expect(mockSearchService.clearFilters).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────
  //  EXP-16: trackByRecipeId
  // ──────────────────────────────────────────────────────────
  describe('trackByRecipeId', () => {
    it('EXP-16: retorna el id de la receta (Dummy)', () => {
      // Arrange
      const recipe = { ...DUMMY_RECIPE, id: 'unique-id' };

      // Act
      const result = component.trackByRecipeId(0, recipe);

      // Assert
      expect(result).toBe('unique-id');
    });
  });

  // ──────────────────────────────────────────────────────────
  //  EXP-17: ngOnDestroy desconecta el observer
  // ──────────────────────────────────────────────────────────
  describe('ngOnDestroy', () => {
    it('EXP-17: desconecta el IntersectionObserver si existe (Spy)', () => {
      // Arrange
      const mockObserver = { disconnect: jasmine.createSpy('disconnect'), observe: jasmine.createSpy('observe') };
      (component as any).observer = mockObserver;

      // Act
      component.ngOnDestroy();

      // Assert
      expect(mockObserver.disconnect).toHaveBeenCalled();
    });

    it('EXP-18: no lanza error si observer es undefined', () => {
      // Arrange
      (component as any).observer = undefined;

      // Act & Assert
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });
});
