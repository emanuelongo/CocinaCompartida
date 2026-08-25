import { Routes } from '@angular/router';
import { Login } from './features/pages/login/login';
import { SignUp } from './features/pages/sign-up/sign-up';
import { Home } from './features/pages/home/home';
import { RecipeUpload} from './features/pages/recipe-upload/recipe-upload';
import { Explore } from './features/pages/explore/explore';
import { Profile } from './features/pages/profile/profile';
import { RecipeDetail } from './features/pages/recipe-detail/recipe-detail';
import { CookingJournal } from './features/pages/cooking-journal/cooking-journal';
import { ShoppingList } from './features/pages/shopping-list/shopping-list';


import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  { 
    path: '', 
    component: Home
},
    { 
    path: 'home', 
    component: Home 
},  
  { path: 'login', 
    component: Login 
},
  { 
    path: 'sign-up', 
    component: SignUp 
},
  { 
    path: 'recipe-upload', 
    component: RecipeUpload,
    canActivate: [authGuard]
},
  {
    path: 'explore',
    component: Explore
  },
  {
    path: 'profile',
    component: Profile,
    canActivate: [authGuard]
  },
  {
    path: 'profile/:id',
    component: Profile
  },
  {
    path: 'cooking-journal',
    component: CookingJournal,
    canActivate: [authGuard]
  },
  {
    path: 'shopping-list',
    component: ShoppingList,
    canActivate: [authGuard]
  },
  { 
    path: 'recipe/:id/edit', 
    component: RecipeUpload,
    canActivate: [authGuard]
  },
    { 
    path: 'recipe/:id', 
    component: RecipeDetail 
  },
  { 
    path: '**', 
    redirectTo: '' 
}

];
