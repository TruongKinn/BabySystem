import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { GuestNavbarComponent } from '../shared/guest-navbar/guest-navbar.component';
import { GuestFooterComponent } from '../shared/guest-footer/guest-footer.component';

export interface Product {
  id: number;
  image: string;
  imageAlt: string;
  category: string;
  categoryKey: string;
  name: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  badgeType?: 'new' | 'sale' | 'hot';
  rating?: number;
  reviewCount?: number;
  brand: string;
}

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, GuestNavbarComponent, GuestFooterComponent],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.css'
})
export class ShopComponent implements OnInit {
  cartCount = 3;
  wishlist = new Set<number>();

  // Filter state
  selectedCategories = new Set<string>(['all']);
  maxPrice = 1000000;
  selectedBrands = new Set<string>();
  sortOption = 'popular';
  searchQuery = '';
  currentPage = 1;
  itemsPerPage = 6;

  categories = [
    { key: 'all', label: 'guest.shop.categoriesList.all' },
    { key: 'diaper', label: 'guest.shop.categoriesList.diaper' },
    { key: 'formula', label: 'guest.shop.categoriesList.formula' },
    { key: 'clothing', label: 'guest.shop.categoriesList.clothing' },
    { key: 'toys', label: 'guest.shop.categoriesList.toys' },
    { key: 'feeding', label: 'guest.shop.categoriesList.feeding' },
    { key: 'skincare', label: 'guest.shop.categoriesList.skincare' },
  ];

  brands = ['Huggies', 'Pampers', 'Meiji', 'Aptamil', 'Nous', 'Pigeon', 'Avent'];

  sortOptions = [
    { value: 'popular', label: 'guest.shop.sort.options.popular' },
    { value: 'price-asc', label: 'guest.shop.sort.options.priceAsc' },
    { value: 'price-desc', label: 'guest.shop.sort.options.priceDesc' },
    { value: 'newest', label: 'guest.shop.sort.options.newest' },
  ];

  allProducts: Product[] = [
    {
      id: 1,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKlH0NbAwS-n4uIyP_qr5AczLBst7Uc3NbdboOloDaFqBu-8SWcIZPzYcYCA3E9C6wWhgSXf2WLDbLHF2_L1y7WQJl8gLvP2GA8y2SyetnXL4a5r-uMQWdcq1OzUeOk0QnvuvQGn-TUmFTUxNN7Z9dmqNbrjqYp3TTgYDi_XccRZYnFqITTP-_VI08twTKttvAoDy7TJ0zs2cVG9qGoDJNJomPFGE-3lNaLGBY8TtO2Kffw-gK-LC2g-6Rk8N6ZNcMKZKxhDdRVNY',
      imageAlt: 'guest.shop.productsList.toys1.alt',
      category: 'guest.shop.categoriesList.toys',
      categoryKey: 'toys',
      name: 'guest.shop.productsList.toys1.name',
      price: 350000,
      badge: 'Mới',
      badgeType: 'new',
      brand: 'Nous',
    },
    {
      id: 2,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsz0tAvm8yyhIFbsVEJdlY7NaItFZK-gxmHN-fVXfBsJc4vV0sRDKTE_oKhBuzgTKEjaPg_K336LfSO9NMlDBS8HAEDS7ciK3FWE-wujFwncVOlTxxtgwMKOP2G1-MfO7jiyDcy1jwZK7Gqt0moJ2e_z-b4zXD06vk5YpLGisVq2OPMY9SH7BzPyfERgF2EcyL8q649OUCf8P_uutweP5dtL_RZbQRrS44_l1qAJ9vdUPBN7qMlb7KnKTkXkIMeTXqcv3fhFAIUog',
      imageAlt: 'guest.shop.productsList.clothing1.alt',
      category: 'guest.shop.categoriesList.clothing',
      categoryKey: 'clothing',
      name: 'guest.shop.productsList.clothing1.name',
      price: 299000,
      rating: 4.5,
      reviewCount: 42,
      brand: 'Nous',
    },
    {
      id: 3,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAenkl9WMMOAT4pvzMLP4Xsx_SeR4UvM0G8PKGxblsawUOZNft7fJjANfkcfgpz0-kjHXKxY3bAcljLIaO1WbGSXzqZkWuvHckxxVFaP_6FvsOAtsyFUYxNktwLifuJnIhKnu37_PVP3pFZvcVV8ipzwdLbo_zUP1l2X9uXBr2sDFOhbsV93WXWE2aWBgFmhjh2m_zZ0EvrYZ8lbHyLvZFmlmeqrGl7rv70CC-lTzwJhRyvPqxAbMbrTWTwe09Ik',
      imageAlt: 'guest.shop.productsList.feeding1.alt',
      category: 'guest.shop.categoriesList.feeding',
      categoryKey: 'feeding',
      name: 'guest.shop.productsList.feeding1.name',
      price: 450000,
      originalPrice: 530000,
      badge: '-15%',
      badgeType: 'sale',
      brand: 'Pigeon',
    },
    {
      id: 4,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKlH0NbAwS-n4uIyP_qr5AczLBst7Uc3NbdboOloDaFqBu-8SWcIZPzYcYCA3E9C6wWhgSXf2WLDbLHF2_L1y7WQJl8gLvP2GA8y2SyetnXL4a5r-uMQWdcq1OzUeOk0QnvuvQGn-TUmFTUxNN7Z9dmqNbrjqYp3TTgYDi_XccRZYnFqITTP-_VI08twTKttvAoDy7TJ0zs2cVG9qGoDJNJomPFGE-3lNaLGBY8TtO2Kffw-gK-LC2g-6Rk8N6ZNcMKZKxhDdRVNY',
      imageAlt: 'guest.shop.productsList.diaper1.alt',
      category: 'guest.shop.categoriesList.diaper',
      categoryKey: 'diaper',
      name: 'guest.shop.productsList.diaper1.name',
      price: 189000,
      rating: 4.8,
      reviewCount: 128,
      badge: 'Hot',
      badgeType: 'hot',
      brand: 'Huggies',
    },
    {
      id: 5,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsz0tAvm8yyhIFbsVEJdlY7NaItFZK-gxmHN-fVXfBsJc4vV0sRDKTE_oKhBuzgTKEjaPg_K336LfSO9NMlDBS8HAEDS7ciK3FWE-wujFwncVOlTxxtgwMKOP2G1-MfO7jiyDcy1jwZK7Gqt0moJ2e_z-b4zXD06vk5YpLGisVq2OPMY9SH7BzPyfERgF2EcyL8q649OUCf8P_uutweP5dtL_RZbQRrS44_l1qAJ9vdUPBN7qMlb7KnKTkXkIMeTXqcv3fhFAIUog',
      imageAlt: 'guest.shop.productsList.formula1.alt',
      category: 'guest.shop.categoriesList.formula',
      categoryKey: 'formula',
      name: 'guest.shop.productsList.formula1.name',
      price: 680000,
      rating: 4.7,
      reviewCount: 85,
      brand: 'Meiji',
    },
    {
      id: 6,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAenkl9WMMOAT4pvzMLP4Xsx_SeR4UvM0G8PKGxblsawUOZNft7fJjANfkcfgpz0-kjHXKxY3bAcljLIaO1WbGSXzqZkWuvHckxxVFaP_6FvsOAtsyFUYxNktwLifuJnIhKnu37_PVP3pFZvcVV8ipzwdLbo_zUP1l2X9uXBr2sDFOhbsV93WXWE2aWBgFmhjh2m_zZ0EvrYZ8lbHyLvZFmlmeqrGl7rv70CC-lTzwJhRyvPqxAbMbrTWTwe09Ik',
      imageAlt: 'guest.shop.productsList.skincare1.alt',
      category: 'guest.shop.categoriesList.skincare',
      categoryKey: 'skincare',
      name: 'guest.shop.productsList.skincare1.name',
      price: 320000,
      originalPrice: 380000,
      badge: '-16%',
      badgeType: 'sale',
      brand: 'Nous',
    },
  ];

  get filteredProducts(): Product[] {
    let result = this.allProducts;

    // Category filter
    if (!this.selectedCategories.has('all')) {
      result = result.filter(p => this.selectedCategories.has(p.categoryKey));
    }

    // Price filter
    result = result.filter(p => p.price <= this.maxPrice);

    // Brand filter
    if (this.selectedBrands.size > 0) {
      result = result.filter(p => this.selectedBrands.has(p.brand));
    }

    // Search
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      // Simple search on translation keys or static fields
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (this.sortOption) {
      case 'price-asc':
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        result = [...result].sort((a, b) => b.id - a.id);
        break;
    }

    return result;
  }

  get totalPages(): number {
    return Math.ceil(this.filteredProducts.length / this.itemsPerPage);
  }

  get paginatedProducts(): Product[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredProducts.slice(start, start + this.itemsPerPage);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  formatPrice(price: number): string {
    return price.toLocaleString('vi-VN') + 'đ';
  }

  formatMaxPrice(): string {
    if (this.maxPrice >= 1000000) return (this.maxPrice / 1000000).toFixed(1) + 'M';
    return (this.maxPrice / 1000).toFixed(0) + 'k';
  }

  getStarArray(rating: number): string[] {
    const stars: string[] = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) stars.push('star');
      else if (i - rating < 1) stars.push('star_half');
      else stars.push('star_border');
    }
    return stars;
  }

  toggleCategory(key: string): void {
    if (key === 'all') {
      this.selectedCategories.clear();
      this.selectedCategories.add('all');
    } else {
      this.selectedCategories.delete('all');
      if (this.selectedCategories.has(key)) {
        this.selectedCategories.delete(key);
        if (this.selectedCategories.size === 0) this.selectedCategories.add('all');
      } else {
        this.selectedCategories.add(key);
      }
    }
    this.currentPage = 1;
  }

  isCategorySelected(key: string): boolean {
    return this.selectedCategories.has(key);
  }

  toggleBrand(brand: string): void {
    if (this.selectedBrands.has(brand)) this.selectedBrands.delete(brand);
    else this.selectedBrands.add(brand);
    this.currentPage = 1;
  }

  isBrandSelected(brand: string): boolean {
    return this.selectedBrands.has(brand);
  }

  clearFilters(): void {
    this.selectedCategories.clear();
    this.selectedCategories.add('all');
    this.selectedBrands.clear();
    this.maxPrice = 1000000;
    this.sortOption = 'popular';
    this.searchQuery = '';
    this.currentPage = 1;
  }

  toggleWishlist(id: number, event: Event): void {
    event.stopPropagation();
    if (this.wishlist.has(id)) this.wishlist.delete(id);
    else this.wishlist.add(id);
  }

  isWishlisted(id: number): boolean {
    return this.wishlist.has(id);
  }

  addToCart(product: Product, event: Event): void {
    event.stopPropagation();
    this.cartCount++;
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
      { threshold: 0.08 }
    );
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }, 100);
  }
}
