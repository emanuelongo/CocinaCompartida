import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Recipe } from '../recipes/entities/recipe.entity';
import { User } from '../user/entities/user.entity';

export interface SeedIngredient {
  nombre: string;
  cantidad: number | string;
  unidad: string;
  otraUnidad?: string;
  importancia?: 'obligatorio' | 'opcional' | 'reemplazable';
  reemplazo?: string;
}

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed(force = false): Promise<{ message: string; count?: number }> {
    const recipesCount = await this.recipeRepository.count();

    if (recipesCount >= 20 && !force) {
      this.logger.log('Ya hay suficientes recetas (' + recipesCount + ') en base de datos, saltando el seeder...');
      return {
        message: `Ya hay suficientes recetas (${recipesCount}) en base de datos, saltando el seeder...`,
        count: recipesCount,
      };
    }

    if (force) {
      this.logger.log('Forzando actualización del seeder de recetas...');
      try {
        const existing = await this.recipeRepository.find({
          where: { user: { username: 'ChefMaestro' } },
        });
        if (existing && existing.length > 0) {
          await this.recipeRepository.remove(existing);
          this.logger.log(`Se eliminaron ${existing.length} recetas anteriores de ChefMaestro para resembrar con nuevos campos.`);
        }
      } catch (err: any) {
        this.logger.warn(`No se pudieron limpiar recetas anteriores: ${err?.message}`);
      }
    }

    this.logger.log('Iniciando el precargado de recetas...');

    // 1. Crear el usuario Chef Maestro si no existe
    let user = await this.userRepository.findOne({ where: { username: 'ChefMaestro' } });
    if (!user) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      user = this.userRepository.create({
        username: 'ChefMaestro',
        password: hashedPassword,
        email: 'chef@cocinacompartida.com',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&q=80',
        bio: 'Me encanta compartir las recetas más ricas y clásicas.',
        role: 'user',
        isActive: true,
      });
      user = await this.userRepository.save(user);
      this.logger.log('Usuario ChefMaestro creado.');
    }

    // Helper para serializar ingredientes en el formato estructurado
    const formatIngredients = (items: SeedIngredient[]): string[] => {
      return items.map((item) =>
        JSON.stringify({
          nombre: item.nombre,
          cantidad: item.cantidad,
          unidad: item.unidad,
          otraUnidad: item.otraUnidad || '',
          importancia: item.importancia || 'obligatorio',
          reemplazo: item.reemplazo || '',
        }),
      );
    };

    // 2. Definir las 20 recetas completas con porciones, cantidades, unidades, importancia y reemplazos
    const seedRecipes = [
      // 1. Tacos al Pastor
      {
        name: 'Tacos al Pastor',
        descripcion: 'Auténticos tacos mexicanos con cerdo marinado en achiote, piña asada y cilantro fresco.',
        servings: 4,
        ingredients: formatIngredients([
          { nombre: 'Pierna de cerdo', cantidad: 1000, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Lomo de cerdo o pechuga de pollo' },
          { nombre: 'Piña madura', cantidad: 1, unidad: 'piezas', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Cilantro fresco', cantidad: 50, unidad: 'g', importancia: 'opcional', reemplazo: 'Perejil picado' },
          { nombre: 'Cebolla blanca', cantidad: 1, unidad: 'piezas', importancia: 'obligatorio', reemplazo: 'Cebolla morada' },
          { nombre: 'Tortillas de maíz', cantidad: 12, unidad: 'piezas', importancia: 'obligatorio', reemplazo: 'Tortillas de harina' },
          { nombre: 'Salsa taquera', cantidad: 100, unidad: 'ml', importancia: 'opcional', reemplazo: 'Salsa verde o roja casera' },
        ]),
        steps: [
          'Cortar la pierna de cerdo en filetes finos y marinar con pasta de achiote, especias y vinagre al menos 4 horas.',
          'Cocinar la carne a fuego alto en una sartén de hierro o parrilla hasta dorar.',
          'Asar rebanadas de piña y picarlas en cubos pequeños.',
          'Calentar las tortillas de maíz en comal.',
          'Montar los tacos con carne, piña asada, cebolla, cilantro y salsa al gusto.',
        ],
        images: ['https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&q=80'],
        tags: ['Mexicana', 'Cena', 'Carne'],
        category: 'platos-fuertes',
        likes: 120,
        likedBy: [],
        user: user,
      },

      // 2. Paella Valenciana
      {
        name: 'Paella Valenciana',
        descripcion: 'El platillo español por excelencia. Una mezcla perfecta de mariscos frescos, azafrán y arroz bomba.',
        servings: 4,
        ingredients: formatIngredients([
          { nombre: 'Arroz bomba', cantidad: 400, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Arroz redondo de grano medio' },
          { nombre: 'Caldo de pescado', cantidad: 1000, unidad: 'ml', importancia: 'obligatorio', reemplazo: 'Caldo de mariscos o verduras' },
          { nombre: 'Azafrán en hebras', cantidad: 1, unidad: 'g', importancia: 'opcional', reemplazo: 'Colorante alimentario o cúrcuma' },
          { nombre: 'Langostinos frescos', cantidad: 8, unidad: 'piezas', importancia: 'obligatorio', reemplazo: 'Camarones grandes' },
          { nombre: 'Mejillones limpios', cantidad: 12, unidad: 'piezas', importancia: 'opcional', reemplazo: 'Almejas' },
          { nombre: 'Calamar en anillas', cantidad: 250, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Sepia troceada' },
          { nombre: 'Tomate triturado', cantidad: 150, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Tomate rallado natural' },
        ]),
        steps: [
          'En una paellera con aceite de oliva, marcar los langostinos y reservar.',
          'Sofreír el calamar junto con el tomate triturado hasta reducir.',
          'Añadir el arroz bomba y nacarar durante 2 minutos a fuego medio.',
          'Verter el caldo de pescado hirviendo con el azafrán infusionado.',
          'Distribuir los mejillones y langostinos; cocer 18 minutos sin remover hasta formar el socarrat.',
        ],
        images: ['https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=800&q=80'],
        tags: ['Española', 'Mariscos', 'Almuerzo'],
        category: 'platos-fuertes',
        likes: 340,
        likedBy: [],
        user: user,
      },

      // 3. Pizza Margherita Casera
      {
        name: 'Pizza Margherita Casera',
        descripcion: 'Pizza tradicional napolitana con masa crujiente, salsa de tomate natural, mozzarella de búfala fresca y albahaca.',
        servings: 3,
        ingredients: formatIngredients([
          { nombre: 'Masa de pizza fermentada', cantidad: 400, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Base para pizza prehecha' },
          { nombre: 'Salsa de tomate casera', cantidad: 150, unidad: 'ml', importancia: 'obligatorio', reemplazo: 'Tomate frito de calidad' },
          { nombre: 'Mozzarella de búfala fresca', cantidad: 250, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Mozzarella rallada común' },
          { nombre: 'Hojas de albahaca fresca', cantidad: 15, unidad: 'g', importancia: 'opcional', reemplazo: 'Orégano seco' },
          { nombre: 'Aceite de oliva virgen extra', cantidad: 20, unidad: 'ml', importancia: 'obligatorio', reemplazo: 'Aceite vegetal suave' },
        ]),
        steps: [
          'Precalentar el horno a máxima temperatura (250°C o más) con la bandeja adentro.',
          'Estirar la masa con las manos desde el centro hacia afuera dejando el borde aireado.',
          'Esparcir la salsa de tomate y desmenuzar la mozzarella en trozos medianos.',
          'Hornear durante 8 a 10 minutos hasta que el queso burbujee y los bordes estén dorados.',
          'Retirar, rociar con un hilo de aceite de oliva y colocar las hojas de albahaca fresca.',
        ],
        images: ['https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80'],
        tags: ['Italiana', 'Cena', 'Vegetariano'],
        category: 'platos-fuertes',
        likes: 560,
        likedBy: [],
        user: user,
      },

      // 4. Sushi de Salmón (Maki y Nigiri)
      {
        name: 'Sushi de Salmón (Maki y Nigiri)',
        descripcion: 'Clásico sushi japonés. Arroz avinagrado sazonado a la perfección con salmón fresco crudo grado sashimi.',
        servings: 2,
        ingredients: formatIngredients([
          { nombre: 'Arroz para sushi (grano corto)', cantidad: 300, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Arroz bomba o redondo' },
          { nombre: 'Vinagre de arroz sazonado', cantidad: 45, unidad: 'ml', importancia: 'obligatorio', reemplazo: 'Vinagre de manzana con sal y azúcar' },
          { nombre: 'Láminas de alga Nori', cantidad: 4, unidad: 'piezas', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Salmón fresco grado sushi', cantidad: 250, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Atún fresco o aguacate' },
          { nombre: 'Salsa de soja japonesa', cantidad: 50, unidad: 'ml', importancia: 'opcional', reemplazo: 'Salsa de soja baja en sodio o tamari' },
          { nombre: 'Pasta de wasabi', cantidad: 10, unidad: 'g', importancia: 'opcional', reemplazo: '' },
        ]),
        steps: [
          'Lavar el arroz 4 veces hasta que el agua salga clara y cocinar tapado.',
          'Extender el arroz tibio y mezclar delicadamente con el vinagre de arroz.',
          'Cortar el salmón en tiras para maki y láminas finas para nigiri.',
          'Armar los rollos sobre esterilla con alga nori, arroz y salmón.',
          'Cortar con un cuchillo bien afilado humedecido y servir con soja y wasabi.',
        ],
        images: ['https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&q=80'],
        tags: ['Japonesa', 'Pescado', 'Cena'],
        category: 'platos-fuertes',
        likes: 89,
        likedBy: [],
        user: user,
      },

      // 5. Hamburguesa Doble Smash
      {
        name: 'Hamburguesa Doble Smash',
        descripcion: 'Dos discos de carne de res aplastados a fuego vivo con costra caramelizada, queso cheddar fundido y pan brioche.',
        servings: 2,
        ingredients: formatIngredients([
          { nombre: 'Carne picada de res 80/20', cantidad: 320, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Carne molida mixta res y cerdo' },
          { nombre: 'Pan brioche para hamburguesa', cantidad: 2, unidad: 'piezas', importancia: 'obligatorio', reemplazo: 'Pan clásico de sésamo' },
          { nombre: 'Lonchas de queso cheddar', cantidad: 4, unidad: 'piezas', importancia: 'obligatorio', reemplazo: 'Queso gouda o monterey jack' },
          { nombre: 'Cebolla picada fina', cantidad: 60, unidad: 'g', importancia: 'opcional', reemplazo: 'Cebolla caramelizada' },
          { nombre: 'Salsa especial para burger', cantidad: 40, unidad: 'ml', importancia: 'opcional', reemplazo: 'Mezcla de mayonesa, kétchup y mostaza' },
          { nombre: 'Rodajas de pepinillo agridulce', cantidad: 30, unidad: 'g', importancia: 'opcional', reemplazo: '' },
        ]),
        steps: [
          'Dividir la carne en 4 bolas de 80g sin apretar demasiado.',
          'Calentar una plancha de hierro a máxima temperatura con una gota de aceite.',
          'Poner las bolas de carne y aplastar fuertemente con una espátula de metal plana (smash).',
          'Salar generosamente, voltear al formarse la costra oscura y colocar el queso inmediatamente.',
          'Tostar el pan brioche con mantequilla, untar salsa y montar la hamburguesa doble.',
        ],
        images: ['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80'],
        tags: ['Americana', 'Comida Rápida', 'Carne'],
        category: 'platos-fuertes',
        likes: 412,
        likedBy: [],
        user: user,
      },

      // 6. Ensalada César Original
      {
        name: 'Ensalada César Original',
        descripcion: 'La auténtica ensalada inventada en Tijuana: lechuga romana crujiente, aderezo casero emulsionado, crutones y parmesano.',
        servings: 2,
        ingredients: formatIngredients([
          { nombre: 'Lechuga romana fresca', cantidad: 300, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Lechuga orejona o iceberg' },
          { nombre: 'Crutones de pan con ajo', cantidad: 80, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Trozos de pan tostado casero' },
          { nombre: 'Queso Parmesano Reggiano', cantidad: 50, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Grana Padano o Manchego curado' },
          { nombre: 'Yema de huevo fresca', cantidad: 1, unidad: 'piezas', importancia: 'obligatorio', reemplazo: '2 cucharadas de mayonesa' },
          { nombre: 'Mostaza Dijon', cantidad: 10, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Mostaza amarilla convencional' },
          { nombre: 'Filetes de anchoa en aceite', cantidad: 4, unidad: 'piezas', importancia: 'reemplazable', reemplazo: 'Unas gotas de salsa Worcestershire' },
          { nombre: 'Aceite de oliva virgen extra', cantidad: 60, unidad: 'ml', importancia: 'obligatorio', reemplazo: 'Aceite de girasol' },
        ]),
        steps: [
          'Triturar en un mortero el diente de ajo con las anchoas hasta formar una pasta.',
          'Añadir la yema de huevo, la mostaza Dijon y el jugo de limón.',
          'Emulsionar batiendo enérgicamente mientras se vierte el aceite de oliva en hilo continuo.',
          'Lavar y secar muy bien la lechuga romana; trocearla con las manos en trozos grandes.',
          'Bañar la lechuga con el aderezo, incorporar crutones y abundantes lascas de queso parmesano.',
        ],
        images: ['https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80'],
        tags: ['Saludable', 'Ensalada', 'Vegetariano'],
        category: 'entradas',
        likes: 125,
        likedBy: [],
        user: user,
      },

      // 7. Brownies Húmedos de Chocolate Fudgy
      {
        name: 'Brownies Húmedos de Chocolate Fudgy',
        descripcion: 'El brownie perfecto: centro suave, húmedo y denso tipo fudge, con una capa brillante y craquelada arriba.',
        servings: 8,
        ingredients: formatIngredients([
          { nombre: 'Chocolate semi-amargo (60-70%)', cantidad: 200, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Gotas de chocolate para repostería' },
          { nombre: 'Mantequilla sin sal', cantidad: 150, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Margarina o aceite de coco' },
          { nombre: 'Huevos grandes', cantidad: 3, unidad: 'piezas', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Azúcar blanco refinado', cantidad: 180, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Azúcar moreno o panela' },
          { nombre: 'Harina de trigo de todo uso', cantidad: 90, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Harina de avena o maicena' },
          { nombre: 'Cacao puro en polvo', cantidad: 30, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Cacao amargo tamizado' },
        ]),
        steps: [
          'Fundir el chocolate con la mantequilla a baño maría suave y dejar templar.',
          'Batir los huevos con el azúcar a velocidad alta durante 5 minutos hasta blanquear y ganar volumen.',
          'Integrar el chocolate derretido con movimientos envolventes.',
          'Tamizar la harina junto con el cacao puro e incorporar sin sobrebatir.',
          'Verter en un molde cuadrado con papel encerado y hornear a 175°C por 22 a 25 minutos.',
        ],
        images: ['https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80'],
        tags: ['Postres', 'Dulce', 'Chocolate'],
        category: 'postres',
        likes: 1304,
        likedBy: [],
        user: user,
      },

      // 8. Pollo al Curry con Leche de Coco
      {
        name: 'Pollo al Curry con Leche de Coco',
        descripcion: 'Pollo tierno bañado en una salsa cremosa y aromática con especias de la India y arroz jazmín al vapor.',
        servings: 4,
        ingredients: formatIngredients([
          { nombre: 'Pechuga de pollo en cubos', cantidad: 600, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Muslos de pollo deshuesados o tofu firme' },
          { nombre: 'Curry en polvo suave o madras', cantidad: 25, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Pasta de curry amarillo o rojo' },
          { nombre: 'Leche de coco cremosa', cantidad: 400, unidad: 'ml', importancia: 'obligatorio', reemplazo: 'Nata para cocinar o yogur griego' },
          { nombre: 'Cebolla blanca picada', cantidad: 1, unidad: 'piezas', importancia: 'obligatorio', reemplazo: 'Cebolleta o chalota' },
          { nombre: 'Dientes de ajo picados', cantidad: 3, unidad: 'piezas', importancia: 'obligatorio', reemplazo: 'Ajo en pasta' },
          { nombre: 'Jengibre fresco rallado', cantidad: 15, unidad: 'g', importancia: 'opcional', reemplazo: 'Jengibre molido en polvo' },
          { nombre: 'Arroz jazmín o basmati', cantidad: 300, unidad: 'g', importancia: 'opcional', reemplazo: 'Arroz blanco largo' },
        ]),
        steps: [
          'Sellar los cubos de pollo salpimentados en una sartén honda y retirar.',
          'En el mismo aceite, pochar la cebolla, ajo y jengibre hasta que estén fragantes.',
          'Añadir el polvo de curry y remover durante 1 minuto para tostar las especias.',
          'Verter la leche de coco, regresar el pollo y dejar cocer a fuego bajo durante 15 minutos.',
          'Servir espolvoreado con cilantro fresco acompañado de arroz jazmín recién hecho.',
        ],
        images: ['https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=80'],
        tags: ['Asiática', 'Pollo', 'Especiado'],
        category: 'platos-fuertes',
        likes: 215,
        likedBy: [],
        user: user,
      },

      // 9. Tarta de Queso Variante San Sebastián
      {
        name: 'Tarta de Queso Variante San Sebastián',
        descripcion: 'La célebre tarta vasca "La Viña": exterior caramelizado y tostado con un corazón cremoso e irresistible.',
        servings: 8,
        ingredients: formatIngredients([
          { nombre: 'Queso crema tipo Philadelphia', cantidad: 600, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Queso mascarpone o mezcla con requesón' },
          { nombre: 'Huevos enteros tamaño L', cantidad: 4, unidad: 'piezas', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Nata líquida para montar (35% grasa)', cantidad: 300, unidad: 'ml', importancia: 'obligatorio', reemplazo: 'Crema de leche espesa' },
          { nombre: 'Azúcar blanquilla', cantidad: 180, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Azúcar glas' },
          { nombre: 'Harina de trigo fina', cantidad: 20, unidad: 'g', importancia: 'opcional', reemplazo: 'Almidón de maíz (Maizena)' },
        ]),
        steps: [
          'Arrugar y humedecer un pliego de papel de horno para forrar un molde desmontable de 20cm.',
          'Batir a baja velocidad el queso crema con el azúcar hasta que quede sedoso.',
          'Incorporar los huevos uno a uno sin meter exceso de aire.',
          'Verter la nata y tamizar la harina, mezclando suavemente.',
          'Hornear a 210°C con calor arriba y abajo durante 40-45 minutos hasta tostar la superficie.',
          'Dejar templar y reposar en nevera al menos 4 horas antes de desmoldar.',
        ],
        images: ['https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&q=80'],
        tags: ['Postres', 'Española', 'Dulce'],
        category: 'postres',
        likes: 955,
        likedBy: [],
        user: user,
      },

      // 10. Ceviche Mixto Peruano
      {
        name: 'Ceviche Mixto Peruano',
        descripcion: 'Emblema del Perú: pescado blanco fresco y mariscos marinados en leche de tigre de lima ácida, ají limo, cebolla y maíz.',
        servings: 3,
        ingredients: formatIngredients([
          { nombre: 'Filete de pescado blanco fresco (Corvina o Mero)', cantidad: 500, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Lenguado, dorada o tilapia fresca' },
          { nombre: 'Camarones y calamares blanqueados', cantidad: 250, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Pulpo cocido o solo pescado' },
          { nombre: 'Limones verdes o limas ácidas', cantidad: 10, unidad: 'piezas', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Cebolla morada en pluma fina', cantidad: 1, unidad: 'piezas', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Cilantro fresco picado finamente', cantidad: 30, unidad: 'g', importancia: 'opcional', reemplazo: '' },
          { nombre: 'Ají limo fresco en cubitos', cantidad: 1, unidad: 'piezas', importancia: 'reemplazable', reemplazo: 'Chile serrano o pasta de ají amarillo' },
          { nombre: 'Canchita peruana (maíz tostado)', cantidad: 100, unidad: 'g', importancia: 'opcional', reemplazo: 'Chifles o rodajas de camote cocido' },
        ]),
        steps: [
          'Cortar el pescado en cubos de 2 cm y mantener bien frío en un bowl con hielos debajo.',
          'Exprimir los limones suavemente a mano (sin presionar la cáscara para no amargar).',
          'Salar el pescado, agregar el ají limo y frotar con un diente de ajo.',
          'Verter el jugo de limón recién exprimido y mezclar delicadamente durante 2 minutos.',
          'Incorporar los mariscos blanqueados, la cebolla morada lavada y el cilantro.',
          'Servir de inmediato acompañado de canchita tostada y rodajas de camote.',
        ],
        images: ['https://images.unsplash.com/photo-1535400255456-984241443b29?w=800&q=80'],
        tags: ['Peruana', 'Mariscos', 'Saludable'],
        category: 'entradas',
        likes: 671,
        likedBy: [],
        user: user,
      },

      // ─── 10 NUEVAS RECETAS ADICIONALES ──────────────────────────────────────

      // 11. Ramen Japonés de Cerdo (Tonkotsu Style)
      {
        name: 'Ramen Japonés de Cerdo (Tonkotsu Style)',
        descripcion: 'Fideos ramen artesanales en caldo concentrado y aromático, huevo marinado ajitsuke tamago y panceta de cerdo chashu.',
        servings: 2,
        ingredients: formatIngredients([
          { nombre: 'Fideos para ramen frescos', cantidad: 250, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Fideos ramen secos o fideos de trigo' },
          { nombre: 'Caldo concentrado de cerdo o pollo', cantidad: 800, unidad: 'ml', importancia: 'obligatorio', reemplazo: 'Caldo de res enriquecido con salsa de soja' },
          { nombre: 'Panceta de cerdo cocida (Chashu)', cantidad: 200, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Lomo de cerdo glaseado o pechuga de pollo' },
          { nombre: 'Huevos marinados en soja (Ajitsuke)', cantidad: 2, unidad: 'piezas', importancia: 'opcional', reemplazo: 'Huevos pasados por agua' },
          { nombre: 'Cebollino fresco picado', cantidad: 30, unidad: 'g', importancia: 'opcional', reemplazo: 'Cebolla verde o puerro' },
          { nombre: 'Aceite de sésamo tostado', cantidad: 15, unidad: 'ml', importancia: 'opcional', reemplazo: 'Aceite de ajo' },
          { nombre: 'Láminas de alga nori', cantidad: 2, unidad: 'piezas', importancia: 'opcional', reemplazo: '' },
        ]),
        steps: [
          'Calentar el caldo concentrado con un toque de salsa de soya, mirin y jengibre hasta hervir.',
          'Cocinar los fideos ramen en agua hirviendo durante 2 a 3 minutos hasta que estén al dente.',
          'Dorar ligeramente las rebanadas de panceta chashu en una sartén seca.',
          'Servir el caldo humeante en boles hondos y colocar los fideos escurridos.',
          'Decorar con la panceta, el huevo cortado por la mitad, cebollino, alga nori y unas gotas de aceite de sésamo.',
        ],
        images: ['https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80'],
        tags: ['Japonesa', 'Sopa', 'Cerdo'],
        category: 'platos-fuertes',
        likes: 512,
        likedBy: [],
        user: user,
      },

      // 12. Guacamole Rústico con Totopos Caseros
      {
        name: 'Guacamole Rústico con Totopos Caseros',
        descripcion: 'Aguacates hass machacados en molcajete con cebolla morada, tomate, jalapeño fresco, zumo de lima y totopos crujientes.',
        servings: 4,
        ingredients: formatIngredients([
          { nombre: 'Aguacates maduros tipo Hass', cantidad: 3, unidad: 'piezas', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Tomate rojo firme en cubitos', cantidad: 1, unidad: 'piezas', importancia: 'obligatorio', reemplazo: 'Tomates cherry en cuartos' },
          { nombre: 'Cebolla morada finamente picada', cantidad: 60, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Cebolla blanca' },
          { nombre: 'Chile jalapeño o serrano', cantidad: 1, unidad: 'piezas', importancia: 'opcional', reemplazo: 'Unas gotas de tabasco o ají verde' },
          { nombre: 'Zumo de lima o limón verde', cantidad: 30, unidad: 'ml', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Cilantro fresco picado', cantidad: 20, unidad: 'g', importancia: 'opcional', reemplazo: '' },
          { nombre: 'Totopos o nachos de maíz', cantidad: 150, unidad: 'g', importancia: 'opcional', reemplazo: 'Tiras de tortilla horneadas o platanitos' },
        ]),
        steps: [
          'Cortar los aguacates por la mitad, retirar el hueso y extraer la pulpa con una cuchara.',
          'Aplastar la pulpa con un tenedor dejando trozos rústicos para una textura cremosa pero con cuerpo.',
          'Agregar inmediatamente el zumo de lima para realzar el sabor y evitar la oxidación.',
          'Incorporar el tomate, cebolla morada, jalapeño picado y cilantro.',
          'Sazonar con sal gruesa al gusto y servir acompañado de totopos de maíz recién tostados.',
        ],
        images: ['https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80'],
        tags: ['Mexicana', 'Botanilla', 'Vegetariano'],
        category: 'entradas',
        likes: 278,
        likedBy: [],
        user: user,
      },

      // 13. Pasta Carbonara Tradicional Romana
      {
        name: 'Pasta Carbonara Tradicional Romana',
        descripcion: 'Espaguetis al dente con auténtico guanciale crujiente, yemas de huevo frescas, queso pecorino romano y pimienta negra.',
        servings: 2,
        ingredients: formatIngredients([
          { nombre: 'Espaguetis de sémola de trigo', cantidad: 220, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Rigatoni o fettuccine' },
          { nombre: 'Guanciale curado en tiras', cantidad: 120, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Panceta curada o tocino ahumado' },
          { nombre: 'Yemas de huevo frescas', cantidad: 3, unidad: 'piezas', importancia: 'obligatorio', reemplazo: '2 huevos enteros batidos' },
          { nombre: 'Queso Pecorino Romano rallado', cantidad: 50, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Queso Parmesano Reggiano' },
          { nombre: 'Pimienta negra recién molida', cantidad: 5, unidad: 'g', importancia: 'obligatorio', reemplazo: '' },
        ]),
        steps: [
          'Hervir los espaguetis en abundante agua con sal hasta dejarlos al dente.',
          'Dorar el guanciale a fuego medio sin aceite añadido hasta que esté dorado y crujiente; retirar del fuego.',
          'En un bol, batir las yemas de huevo con el pecorino romano y abundante pimienta negra.',
          'Pasar la pasta directamente a la sartén tibia con el guanciale y añadir un cucharón del agua de cocción.',
          'Verter la mezcla de yemas fuera del fuego y remover rápido para emulsionar una crema sedosa sin cuajar.',
        ],
        images: ['https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80'],
        tags: ['Italiana', 'Pasta', 'Cena'],
        category: 'platos-fuertes',
        likes: 840,
        likedBy: [],
        user: user,
      },

      // 14. Papas Gajo Rústicas al Romero y Ajo
      {
        name: 'Papas Gajo Rústicas al Romero y Ajo',
        descripcion: 'Gajos de papa dorados y crujientes por fuera con interior tierno, aromatizados con romero fresco, ajo y pimentón.',
        servings: 4,
        ingredients: formatIngredients([
          { nombre: 'Papas medianas con piel limpia', cantidad: 800, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Batatas o camotes' },
          { nombre: 'Aceite de oliva virgen extra', cantidad: 45, unidad: 'ml', importancia: 'obligatorio', reemplazo: 'Aceite de girasol' },
          { nombre: 'Ramas de romero fresco picado', cantidad: 10, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Romero seco o tomillo' },
          { nombre: 'Ajo en polvo o 2 dientes majados', cantidad: 5, unidad: 'g', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Pimentón dulce o ahumado', cantidad: 5, unidad: 'g', importancia: 'opcional', reemplazo: 'Páprika picante' },
          { nombre: 'Sal marina gruesa', cantidad: 8, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Sal común' },
        ]),
        steps: [
          'Lavar muy bien las papas y cortarlas en gajos regulares de tamaño medio manteniendo la piel.',
          'Hervir los gajos durante 5 minutos en agua con sal; escurrir y dejar evaporar el vapor.',
          'Mezclar en un tazón con el aceite de oliva, romero, ajo, pimentón y sal hasta impregnar bien.',
          'Colocar en una sola capa sobre una bandeja de horno con papel vegetal.',
          'Hornear a 220°C durante 25 a 30 minutos, volteando a la mitad hasta que queden doradas y crocantes.',
        ],
        images: ['https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80'],
        tags: ['Guarnición', 'Papas', 'Vegetariano'],
        category: 'guarniciones',
        likes: 195,
        likedBy: [],
        user: user,
      },

      // 15. Limonada de Coco Caribeña
      {
        name: 'Limonada de Coco Caribeña',
        descripcion: 'La icónica bebida cremosa de la costa caribeña: crema de coco licuada con zumo de limón fresco y hielo frappé.',
        servings: 3,
        ingredients: formatIngredients([
          { nombre: 'Crema de coco endulzada', cantidad: 200, unidad: 'ml', importancia: 'obligatorio', reemplazo: 'Leche de coco espesa con 2 cucharadas de azúcar' },
          { nombre: 'Zumo de limón o lima fresco', cantidad: 80, unidad: 'ml', importancia: 'obligatorio', reemplazo: 'Zumo de limón amarillo' },
          { nombre: 'Cubos de hielo compacto', cantidad: 400, unidad: 'g', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Leche condensada', cantidad: 40, unidad: 'g', importancia: 'opcional', reemplazo: 'Azúcar al gusto o sirope de agave' },
          { nombre: 'Hojas de hierbabuena fresca', cantidad: 6, unidad: 'piezas', importancia: 'opcional', reemplazo: 'Hojas de menta para decorar' },
        ]),
        steps: [
          'Exprimir los limones justo antes de preparar para que el zumo no se amargue.',
          'Colocar en la licuadora la crema de coco, el zumo de limón y la leche condensada.',
          'Añadir abundante hielo y licuar a máxima potencia hasta lograr una consistencia frappé sedosa.',
          'Probar el balance entre dulce y ácido, ajustando con unas gotas de limón si es necesario.',
          'Servir de inmediato en vasos altos decorados con rodajas de lima y hojas de hierbabuena.',
        ],
        images: ['https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80'],
        tags: ['Bebidas', 'Caribeña', 'Refrescante'],
        category: 'bebidas',
        likes: 432,
        likedBy: [],
        user: user,
      },

      // 16. Arepas Rellenas de Carne Desmechada y Queso
      {
        name: 'Arepas Rellenas de Carne Desmechada y Queso',
        descripcion: 'Arepas de maíz blanco doradas al comal, abiertas y rellenas con carne de res desmechada en hogao y queso derretido.',
        servings: 4,
        ingredients: formatIngredients([
          { nombre: 'Harina de maíz precocida blanca', cantidad: 300, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Harina de maíz amarillo precocida' },
          { nombre: 'Agua tibia', cantidad: 450, unidad: 'ml', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Carne de res desmechada cocida', cantidad: 350, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Pollo desmechado o frijoles refritos' },
          { nombre: 'Hogao casero (tomate, cebolla y ajo)', cantidad: 100, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Salsa sofrito criollo' },
          { nombre: 'Queso mozzarella rallado', cantidad: 150, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Queso costeño, feta o gouda' },
          { nombre: 'Mantequilla para untar', cantidad: 20, unidad: 'g', importancia: 'opcional', reemplazo: '' },
        ]),
        steps: [
          'Mezclar en un tazón el agua tibia, sal y verter la harina de maíz poco a poco; amasar hasta suavizar.',
          'Formar 4 bolas y aplastarlas en discos de 1.5 cm de grosor.',
          'Asar las arepas en una plancha caliente untada de mantequilla durante 6-7 minutos por lado hasta dorar.',
          'Guisar la carne desmechada con el hogao a fuego bajo por 5 minutos.',
          'Abrir las arepas por la mitad, untar mantequilla y rellenar con abundante carne caliente y queso derretido.',
        ],
        images: ['https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&q=80'],
        tags: ['Colombiana', 'Latina', 'Desayuno'],
        category: 'platos-fuertes',
        likes: 310,
        likedBy: [],
        user: user,
      },

      // 17. Tiramisú Clásico Italiano
      {
        name: 'Tiramisú Clásico Italiano',
        descripcion: 'Bizcochos soletilla empapados en espresso italiano y licor amaretto, con capas de crema de mascarpone y cacao.',
        servings: 6,
        ingredients: formatIngredients([
          { nombre: 'Queso Mascarpone italiano', cantidad: 400, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Queso crema batido con un poco de nata' },
          { nombre: 'Bizcochos de soletilla (Savoiardi)', cantidad: 200, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Vainillas o bizcocho esponjoso' },
          { nombre: 'Café espresso recién preparado', cantidad: 250, unidad: 'ml', importancia: 'obligatorio', reemplazo: 'Café fuerte soluble' },
          { nombre: 'Huevos frescos (yemas y claras)', cantidad: 3, unidad: 'piezas', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Azúcar blanco', cantidad: 90, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Azúcar glas' },
          { nombre: 'Licor Amaretto o Marsala', cantidad: 30, unidad: 'ml', importancia: 'opcional', reemplazo: 'Ron añejo o licor de café' },
          { nombre: 'Cacao amargo en polvo', cantidad: 25, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Chocolate negro rallado' },
        ]),
        steps: [
          'Preparar el café espresso, mezclar con el licor amaretto en un plato hondo y dejar enfriar.',
          'Batir las yemas de huevo con el azúcar hasta blanquear; incorporar el mascarpone con espátula.',
          'Montar las claras a punto de nieve e integrarlas suavemente a la mezcla con movimientos envolventes.',
          'Remojar rápidamente los bizcochos en el café y colocar una primera capa en la base de una fuente.',
          'Cubrir con la mitad de la crema de mascarpone, repetir otra capa de bizcochos y terminar con crema.',
          'Refrigerar mínimo 6 horas y espolvorear generosamente con cacao amargo justo antes de servir.',
        ],
        images: ['https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=80'],
        tags: ['Italiana', 'Postres', 'Café'],
        category: 'postres',
        likes: 720,
        likedBy: [],
        user: user,
      },

      // 18. Margarita Helada de Maracuyá
      {
        name: 'Margarita Helada de Maracuyá',
        descripcion: 'Cóctel frappé tropical con pulpa fresca de maracuyá (fruta de la pasión), tequila reposado, triple sec y borde de sal.',
        servings: 2,
        ingredients: formatIngredients([
          { nombre: 'Pulpa de maracuyá natural (sin semillas)', cantidad: 100, unidad: 'ml', importancia: 'obligatorio', reemplazo: 'Concentrado de fruta de la pasión' },
          { nombre: 'Tequila blanco o reposado', cantidad: 90, unidad: 'ml', importancia: 'obligatorio', reemplazo: 'Mezcal joven' },
          { nombre: 'Licor Triple Sec o Cointreau', cantidad: 45, unidad: 'ml', importancia: 'obligatorio', reemplazo: 'Licor de naranja o zumo de naranja' },
          { nombre: 'Zumo de lima recién exprimido', cantidad: 30, unidad: 'ml', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Sirope de agave o jarabe simple', cantidad: 30, unidad: 'ml', importancia: 'opcional', reemplazo: 'Miel de abejas o azúcar líquida' },
          { nombre: 'Hielo picado', cantidad: 300, unidad: 'g', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Sal y chile en polvo (Tajín) para escarchar', cantidad: 10, unidad: 'g', importancia: 'opcional', reemplazo: 'Sal fina' },
        ]),
        steps: [
          'Pasar una rodaja de lima por el borde de las copas y pasarlas por el plato con sal y tajín para escarchar.',
          'En el vaso de la licuadora, agregar la pulpa de maracuyá, el tequila, triple sec, zumo de lima y sirope.',
          'Añadir el hielo picado y licuar a velocidad máxima hasta lograr una textura granizada uniforme.',
          'Verter delicadamente en las copas preparadas sin tocar el borde escarchado.',
          'Decorar con media rodaja de lima o unas pocas semillas de maracuyá en la superficie.',
        ],
        images: ['https://images.unsplash.com/photo-1556881286-fc6915169721?w=800&q=80'],
        tags: ['Bebidas', 'Cócteles', 'Tropical'],
        category: 'bebidas',
        likes: 388,
        likedBy: [],
        user: user,
      },

      // 19. Arroz Chaufa Peruano de Pollo y Vegetales
      {
        name: 'Arroz Chaufa Peruano de Pollo y Vegetales',
        descripcion: 'Arroz salteado al wok a fuego vivo con trozos de pollo dorado, tortilla de huevo troceada, cebollita china y sésamo.',
        servings: 3,
        ingredients: formatIngredients([
          { nombre: 'Arroz blanco cocido del día anterior', cantidad: 450, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Arroz jazmín cocido y frío' },
          { nombre: 'Pechuga de pollo en trozos pequeños', cantidad: 250, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Carne de cerdo, lomo o camarones' },
          { nombre: 'Huevos batidos para tortilla', cantidad: 2, unidad: 'piezas', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Cebolla china (cebolleta) en rodajas', cantidad: 50, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Puerro fino' },
          { nombre: 'Salsa de soya oscura (Sillao)', cantidad: 30, unidad: 'ml', importancia: 'obligatorio', reemplazo: 'Salsa de soya tradicional' },
          { nombre: 'Aceite de ajonjolí (sésamo)', cantidad: 10, unidad: 'ml', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Jengibre fresco picado fino (kion)', cantidad: 10, unidad: 'g', importancia: 'opcional', reemplazo: '' },
        ]),
        steps: [
          'Hacer una tortilla delgada con los huevos batidos en una sartén con poco aceite, picar en cuadritos y reservar.',
          'Calentar un wok o sartén grande a fuego muy vivo con un chorro de aceite vegetal.',
          'Dorar el pollo salpimentado rápidamente junto con el jengibre rallado.',
          'Agregar el arroz frío separando los granos con la espátula y salteando vigorosamente.',
          'Verter la salsa de soya por los bordes del wok para que caramelice, añadir la tortilla picada y el aceite de sésamo.',
          'Apagar el fuego, incorporar la cebolla china picada fresca, remover y servir caliente.',
        ],
        images: ['https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=80'],
        tags: ['Peruana', 'Chifa', 'Arroz'],
        category: 'platos-fuertes',
        likes: 620,
        likedBy: [],
        user: user,
      },

      // 20. Hummus Tradicional con Aceite de Oliva y Pimentón
      {
        name: 'Hummus Tradicional con Aceite de Oliva y Pimentón',
        descripcion: 'Crema aterciopelada de garbanzos cocidos con pasta de sésamo tahini, limón, ajo confitado y pimentón dulce.',
        servings: 4,
        ingredients: formatIngredients([
          { nombre: 'Garbanzos cocidos y escurridos', cantidad: 400, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Garbanzos en conserva lavados' },
          { nombre: 'Pasta de sésamo (Tahini)', cantidad: 60, unidad: 'g', importancia: 'obligatorio', reemplazo: 'Mantequilla de cacahuete sin sal' },
          { nombre: 'Zumo de limón fresco', cantidad: 35, unidad: 'ml', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Diente de ajo pequeño sin germen', cantidad: 1, unidad: 'piezas', importancia: 'opcional', reemplazo: 'Ajo asado suave' },
          { nombre: 'Aceite de oliva virgen extra', cantidad: 50, unidad: 'ml', importancia: 'obligatorio', reemplazo: '' },
          { nombre: 'Agua helada con hielo', cantidad: 50, unidad: 'ml', importancia: 'obligatorio', reemplazo: 'Caldo de cocción de los garbanzos' },
          { nombre: 'Comino molido y pimentón dulce', cantidad: 5, unidad: 'g', importancia: 'opcional', reemplazo: 'Zaatar o pimentón picante' },
        ]),
        steps: [
          'En el vaso del procesador de alimentos, triturar primero el tahini con el zumo de limón durante 1 minuto hasta emulsionar.',
          'Añadir el ajo, el comino y una pizca generosa de sal.',
          'Incorporar los garbanzos cocidos y triturar a velocidad alta raspando los bordes.',
          'Verter el agua helada poco a poco mientras se procesa para lograr una textura ultra sedosa y aireada.',
          'Servir en un plato hondo haciendo un surco con la cuchara, bañar con aceite de oliva y espolvorear pimentón dulce.',
        ],
        images: ['https://images.unsplash.com/photo-1637949385162-e416fb15b2ce?w=800&q=80'],
        tags: ['Árabe', 'Entradas', 'Vegano'],
        category: 'entradas',
        likes: 312,
        likedBy: [],
        user: user,
      },
    ];

    const recipesEntities = this.recipeRepository.create(seedRecipes);
    await this.recipeRepository.save(recipesEntities);
    this.logger.log('Las 20 recetas han sido precargadas exitosamente.');

    return {
      message: 'Las 20 recetas han sido precargadas exitosamente.',
      count: seedRecipes.length,
    };
  }
}
