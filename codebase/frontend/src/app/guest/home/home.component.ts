import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { GuestNavbarComponent } from '../shared/guest-navbar/guest-navbar.component';
import { GuestFooterComponent } from '../shared/guest-footer/guest-footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, GuestNavbarComponent, GuestFooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

  articles = [
    {
      image: 'images/home/article-sleep.jpg',
      alt: 'guest.home.articles.easy.alt',
      category: 'guest.home.articles.easy.category',
      categoryClass: 'category-sleep',
      title: 'guest.home.articles.easy.title',
      description: 'guest.home.articles.easy.desc',
      author: 'guest.home.articles.easy.author',
      readTime: 'guest.home.articles.easy.readTime'
    },
    {
      image: 'images/home/article-nutrition.jpg',
      alt: 'guest.home.articles.blw.alt',
      category: 'guest.home.articles.blw.category',
      categoryClass: 'category-nutrition',
      title: 'guest.home.articles.blw.title',
      description: 'guest.home.articles.blw.desc',
      author: 'guest.home.articles.blw.author',
      readTime: 'guest.home.articles.blw.readTime'
    },
    {
      image: 'images/home/article-play.jpg',
      alt: 'guest.home.articles.play.alt',
      category: 'guest.home.articles.play.category',
      categoryClass: 'category-develop',
      title: 'guest.home.articles.play.title',
      description: 'guest.home.articles.play.desc',
      author: 'guest.home.articles.play.author',
      readTime: 'guest.home.articles.play.readTime'
    }
  ];

  products = [
    {
      image: 'images/home/product-lotion.jpg',
      alt: 'guest.home.products.lotion.alt',
      category: 'guest.home.products.lotion.category',
      name: 'guest.home.products.lotion.name',
      price: 'guest.home.products.lotion.price'
    },
    {
      image: 'images/home/product-bowl.jpg',
      alt: 'guest.home.products.bowl.alt',
      category: 'guest.home.products.bowl.category',
      name: 'guest.home.products.bowl.name',
      price: 'guest.home.products.bowl.price'
    }
  ];
}
