import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { GuestNavbarComponent } from '../shared/guest-navbar/guest-navbar.component';
import { GuestFooterComponent } from '../shared/guest-footer/guest-footer.component';

export interface Article {
  id: number;
  image: string;
  imageAlt: string;
  category: string;
  categoryClass: string;
  readTime: string;
  title: string;
  description: string;
  author: string;
  isFeatured?: boolean;
}

@Component({
  selector: 'app-handbook',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, GuestNavbarComponent, GuestFooterComponent],
  templateUrl: './handbook.component.html',
  styleUrl: './handbook.component.css'
})
export class HandbookComponent implements OnInit {
  searchQuery = '';
  activeFilter = 'Tất cả';
  savedArticles = new Set<number>();

  filters = [
    { key: 'guest.handbook.filters.all', value: 'Tất cả' },
    { key: 'guest.handbook.filters.newborn', value: 'Trẻ sơ sinh' },
    { key: 'guest.handbook.filters.nutrition', value: 'Dinh dưỡng sau sinh' },
    { key: 'guest.handbook.filters.develop', value: 'Phát triển của bé' },
    { key: 'guest.handbook.filters.sleep', value: 'Giấc ngủ' },
    { key: 'guest.handbook.filters.mental', value: 'Sức khỏe tâm lý mẹ' },
  ];

  featuredArticle: Article = {
    id: 0,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGeuxz4CuEbrhJwes5AyEUAQX7MYMQjs7MB5dbJ72e3wOmjZO8B_q4ICOwHIDWRtciLw92hrSwaZpgrwvzL8siT2TFJCILbnxyv1uMTd-ghnSxWxq-gawPOZFiLDlHHaObXH2cDOeLxiwl4yxtUBisu4xYHCAgKq6raI_82lFhij2pqncf9rAbOkBg6XzimB0m3XuVnchB0-Eg_zNOUNwDuk02cq55HNNiiqGtfYPcrtD8vVH1TkLzq8G23O3NRHxwVlRJzub2eh8',
    imageAlt: 'guest.common.brand',
    category: 'Bài viết nổi bật',
    categoryClass: 'category-featured',
    readTime: 'guest.handbook.articles.featured.readTime',
    title: 'guest.handbook.articles.featured.title',
    description: 'guest.handbook.articles.featured.desc',
    author: 'guest.handbook.articles.featured.author',
    isFeatured: true,
  };

  allArticles: Article[] = [
    {
      id: 1,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqJ7gyfEjQT7tyXUadntYSmESXxhOHo3ot-SCkP1jVkUzWpvWMOizsctN4FSzuVDCY3b9F_QO6VULYak0rFZ0egDzdJSn3qsCHw31XXyz9aXlyRSDSi7KR3SLRwHtvDPyIu6Wd42RGhR2M7rk5kuBWYd9tNlm-wLUEyzVGxKPqQ6D593KQIU-liWrQyx5THMxJ2HrF3Sv6I_41hNEIJhX50c8hTvyAEXFKHC4xuB-2UswviRneWq1K2_nKPjYSz0DnJLQMNLHIrso',
      imageAlt: 'guest.common.brand',
      category: 'Dinh dưỡng sau sinh',
      categoryClass: 'category-nutrition',
      readTime: 'guest.handbook.articles.milk.readTime',
      title: 'guest.handbook.articles.milk.title',
      description: 'guest.handbook.articles.milk.desc',
      author: 'guest.handbook.articles.milk.author',
    },
    {
      id: 2,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9NWRtX_Qx5qh6aMj6HE5kcAkA7UNnAqtAIMrUJCkj09bbJ9yG7fZx_0kmacxnjRrZbHwpHiq8hoWCBnzGwEzTVcIT4SlE9h5g83BAD4SMF7rkFBEw-qgEZlcecikN5m4cGX2ZInnvLdUf0CsNMCJE7iWWbu3tukiH87HDxrGGVofiOhxsXjXTpAADS9KBLs5I5ogc3FMUE7e4rKk_PCpTAn0vyXnC1ZMG_vjC6ShF5PHaDBUVT2PBIkZI-scTyuemEyDhcEMqT8s',
      imageAlt: 'guest.common.brand',
      category: 'Trẻ sơ sinh',
      categoryClass: 'category-newborn',
      readTime: 'guest.handbook.articles.umbilical.readTime',
      title: 'guest.handbook.articles.umbilical.title',
      description: 'guest.handbook.articles.umbilical.desc',
      author: 'guest.handbook.articles.umbilical.author',
    },
    {
      id: 3,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAeHN8uTrFTw49IiMUgyedZKgzhV3E7-qmb1YF2Mk57IFY9LaFjTARrpvkZykmgG6Csc36Ude8Dy9fJqofF-HkxZMRjW6Pa0mNP_NSrrf7Zsaic9sAjbIYXPijhy1PAbPwov3nAbzMwoFSIQiXTcGtnVwPnvbieHeIzukOG0qYfuHNkPxMhGe9WoHQeqSbHTdbp8O5fFrQ3ZggVAaNY1Ztspm--Jli9VwXtGxHPIpaT1jg1_iu9_E4m1IvNsTgVB6M3Lp1Ek_TsOe8',
      imageAlt: 'guest.common.brand',
      category: 'Phát triển của bé',
      categoryClass: 'category-develop',
      readTime: 'guest.handbook.articles.ww19.readTime',
      title: 'guest.handbook.articles.ww19.title',
      description: 'guest.handbook.articles.ww19.desc',
      author: 'guest.handbook.articles.ww19.author',
    },
    {
      id: 4,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqJ7gyfEjQT7tyXUadntYSmESXxhOHo3ot-SCkP1jVkUzWpvWMOizsctN4FSzuVDCY3b9F_QO6VULYak0rFZ0egDzdJSn3qsCHw31XXyz9aXlyRSDSi7KR3SLRwHtvDPyIu6Wd42RGhR2M7rk5kuBWYd9tNlm-wLUEyzVGxKPqQ6D593KQIU-liWrQyx5THMxJ2HrF3Sv6I_41hNEIJhX50c8hTvyAEXFKHC4xuB-2UswviRneWq1K2_nKPjYSz0DnJLQMNLHIrso',
      imageAlt: 'guest.common.brand',
      category: 'Sức khỏe tâm lý mẹ',
      categoryClass: 'category-mental',
      readTime: 'guest.handbook.articles.depression.readTime',
      title: 'guest.handbook.articles.depression.title',
      description: 'guest.handbook.articles.depression.desc',
      author: 'guest.handbook.articles.depression.author',
    },
    {
      id: 5,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9NWRtX_Qx5qh6aMj6HE5kcAkA7UNnAqtAIMrUJCkj09bbJ9yG7fZx_0kmacxnjRrZbHwpHiq8hoWCBnzGwEzTVcIT4SlE9h5g83BAD4SMF7rkFBEw-qgEZlcecikN5m4cGX2ZInnvLdUf0CsNMCJE7iWWbu3tukiH87HDxrGGVofiOhxsXjXTpAADS9KBLs5I5ogc3FMUE7e4rKk_PCpTAn0vyXnC1ZMG_vjC6ShF5PHaDBUVT2PBIkZI-scTyuemEyDhcEMqT8s',
      imageAlt: 'guest.common.brand',
      category: 'Giấc ngủ',
      categoryClass: 'category-sleep',
      readTime: 'guest.handbook.articles.ferber.readTime',
      title: 'guest.handbook.articles.ferber.title',
      description: 'guest.handbook.articles.ferber.desc',
      author: 'guest.handbook.articles.ferber.author',
    },
    {
      id: 6,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAeHN8uTrFTw49IiMUgyedZKgzhV3E7-qmb1YF2Mk57IFY9LaFjTARrpvkZykmgG6Csc36Ude8Dy9fJqofF-HkxZMRjW6Pa0mNP_NSrrf7Zsaic9sAjbIYXPijhy1PAbPwov3nAbzMwoFSIQiXTcGtnVwPnvbieHeIzukOG0qYfuHNkPxMhGe9WoHQeqSbHTdbp8O5fFrQ3ZggVAaNY1Ztspm--Jli9VwXtGxHPIpaT1jg1_iu9_E4m1IvNsTgVB6M3Lp1Ek_TsOe8',
      imageAlt: 'guest.common.brand',
      category: 'Phát triển của bé',
      categoryClass: 'category-develop',
      readTime: 'guest.handbook.articles.motor.readTime',
      title: 'guest.handbook.articles.motor.title',
      description: 'guest.handbook.articles.motor.desc',
      author: 'guest.handbook.articles.motor.author',
    },
  ];

  getCategoryKey(category: string): string {
    switch (category) {
      case 'Trẻ sơ sinh': return 'guest.handbook.filters.newborn';
      case 'Dinh dưỡng sau sinh': return 'guest.handbook.filters.nutrition';
      case 'Phát triển của bé': return 'guest.handbook.filters.develop';
      case 'Giấc ngủ': return 'guest.handbook.filters.sleep';
      case 'Sức khỏe tâm lý mẹ': return 'guest.handbook.filters.mental';
      default: return 'guest.handbook.filters.all';
    }
  }

  get filteredArticles(): Article[] {
    let articles = this.allArticles;
    if (this.activeFilter !== 'Tất cả') {
      articles = articles.filter(a => a.category === this.activeFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      // Since title/desc/category are translation keys in allArticles, we can't easily search them translated here,
      // but we can translate them or search the keys. To do it correctly on client side with translations,
      // a common simple approach for mock data is to let the user search. We will keep it simple and search the keys
      // or map back, but since this is mock, simple key inclusion or static search is fine.
      // Alternatively, let's keep search simple:
      articles = articles.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    }
    return articles;
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
  }

  toggleSave(id: number, event: Event): void {
    event.stopPropagation();
    if (this.savedArticles.has(id)) {
      this.savedArticles.delete(id);
    } else {
      this.savedArticles.add(id);
    }
  }

  isSaved(id: number): boolean {
    return this.savedArticles.has(id);
  }

  ngOnInit(): void {
    this.initScrollReveal();
  }

  private initScrollReveal(): void {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }, 100);
  }
}
