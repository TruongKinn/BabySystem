import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { GuestNavbarComponent } from '../shared/guest-navbar/guest-navbar.component';
import { GuestFooterComponent } from '../shared/guest-footer/guest-footer.component';

export interface Post {
  id: number;
  authorName: string;
  authorAvatar: string;
  authorBadge?: string;
  timeAgo: string;
  category: string;
  title: string;
  content: string;
  likes: number;
  comments: number;
  isPinned?: boolean;
  isLiked?: boolean;
  isSaved?: boolean;
}

export interface TrendingTopic {
  rank: number;
  title: string;
  views: string;
}

export interface RecentComment {
  authorName: string;
  authorAvatar: string;
  postTitle: string;
  excerpt: string;
  timeAgo: string;
}

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, GuestNavbarComponent, GuestFooterComponent],
  templateUrl: './community.component.html',
  styleUrl: './community.component.css'
})
export class CommunityComponent implements OnInit {
  private router = inject(Router);

  activeFilter = 'Tất cả';
  showNewPostForm = false;
  newPostTitle = '';
  newPostContent = '';
  newPostCategory = 'Kinh nghiệm làm mẹ';

  filters = [
    { key: 'guest.community.filters.all', value: 'Tất cả' },
    { key: 'guest.community.filters.sleep', value: 'Giấc ngủ của bé' },
    { key: 'guest.community.filters.nutrition', value: 'Dinh dưỡng & Ăn dặm' },
    { key: 'guest.community.filters.experience', value: 'Kinh nghiệm làm mẹ' },
    { key: 'guest.community.filters.review', value: 'Review đồ dùng' },
  ];

  postCategories = [
    { key: 'guest.community.filters.sleep', value: 'Giấc ngủ của bé' },
    { key: 'guest.community.filters.nutrition', value: 'Dinh dưỡng & Ăn dặm' },
    { key: 'guest.community.filters.experience', value: 'Kinh nghiệm làm mẹ' },
    { key: 'guest.community.filters.review', value: 'Review đồ dùng' },
  ];

  allPosts: Post[] = [
    {
      id: 0,
      authorName: 'Admin Mẹ Bé Yêu',
      authorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATyZtCqbymVujEXs_JZk10V8MMU86D9plYPt58Isv01gy5w26mEDt1MxXcn7itkEkNYu5DAmEqXK73O5Wn_dbPabD8UU0ZBtR7IP8KeYv-ro8rV8TFa9ZvCwUi4AOsgwjbapkz_Tq2Dh-yUFlHrNmPPSerrfw_Uo-sFIo7-QbFnmJjWbBasc-Yd0seihTxjcnU7uaJLuoGcVPfEZ59SVAh_xWnBJCpJMYxfh_rnRvVCVTTdbtI00U4hzMYZ_pZ3Fu1lNyH78RkovQ',
      authorBadge: 'Admin',
      timeAgo: '2', // Hours for param
      category: 'Thông báo',
      title: 'guest.community.posts.rules.title',
      content: 'guest.community.posts.rules.content',
      likes: 342,
      comments: 89,
      isPinned: true,
      isLiked: false,
      isSaved: false,
    },
    {
      id: 1,
      authorName: 'Mẹ Cún Híp',
      authorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAW8PDqGRZUJrImWr19pwqaizpuWwkLJjD2BCeEPgI0kLuZdffgkz10u1981HGX9RNVPpsS89lj8poVASZEKbSVlTC9fZrtKotY7yiASngk27BKyIq4b4LSjJJeCmrH1EzrziP2FBNez45ZjhRL6UHlBw-D9ESaYHD0h1sfVbuzufm02W75roHV7yCi7rJsDVj7-L50KQF9zmtuOIk06a3xtLXP5_9RiwXtRvncF_FKY_zVDzrAbxdnBzrClx_ozI6HYy72qxhGEgk',
      timeAgo: '0', // Just now
      category: 'Dinh dưỡng & Ăn dặm',
      title: 'guest.community.posts.weaning.title',
      content: 'guest.community.posts.weaning.content',
      likes: 15,
      comments: 8,
      isLiked: false,
      isSaved: false,
    },
    {
      id: 2,
      authorName: 'Mẹ Bắp Rang',
      authorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6E6Yh0L68BMdl644GtzaPoeVQ6kUftUwfCttkD4oYNgjTOiUq0EIJxAZqUzyZnFZQRDbYM2vHImCVsimflnep6_JR6S8tTKzMUHugk3Rf-ThlrkxKmNUwW8PvB5nJmb9x4JQTxLuZnZn4ibjSP34hz4uQk1g4EPfzrnyR_KQvtzH3ukHkdmbYAT4SGgiMfV9KHYqEH-KPzgpczzVa-v-KOLZO6Ser3KbWWv_DiHR8vfVIJoDuhof781di0bOu25pR-50TjOYyt1Q',
      timeAgo: '3', // Hours
      category: 'Giấc ngủ của bé',
      title: 'guest.community.posts.ww19.title',
      content: 'guest.community.posts.ww19.content',
      likes: 87,
      comments: 34,
      isLiked: true,
      isSaved: true,
    },
    {
      id: 3,
      authorName: 'Mẹ Khoai Lang',
      authorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATyZtCqbymVujEXs_JZk10V8MMU86D9plYPt58Isv01gy5w26mEDt1MxXcn7itkEkNYu5DAmEqXK73O5Wn_dbPabD8UU0ZBtR7IP8KeYv-ro8rV8TFa9ZvCwUi4AOsgwjbapkz_Tq2Dh-yUFlHrNmPPSerrfw_Uo-sFIo7-QbFnmJjWbBasc-Yd0seihTxjcnU7uaJLuoGcVPfEZ59SVAh_xWnBJCpJMYxfh_rnRvVCVTTdbtI00U4hzMYZ_pZ3Fu1lNyH78RkovQ',
      timeAgo: '5', // Hours
      category: 'Review đồ dùng',
      title: 'guest.community.posts.diapers.title',
      content: 'guest.community.posts.diapers.content',
      likes: 203,
      comments: 61,
      isLiked: false,
      isSaved: false,
    },
    {
      id: 4,
      authorName: 'BS. Nguyễn Thu',
      authorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAW8PDqGRZUJrImWr19pwqaizpuWwkLJjD2BCeEPgI0kLuZdffgkz10u1981HGX9RNVPpsS89lj8poVASZEKbSVlTC9fZrtKotY7yiASngk27BKyIq4b4LSjJJeCmrH1EzrziP2FBNez45ZjhRL6UHlBw-D9ESaYHD0h1sfVbuzufm02W75roHV7yCi7rJsDVj7-L50KQF9zmtuOIk06a3xtLXP5_9RiwXtRvncF_FKY_zVDzrAbxdnBzrClx_ozI6HYy72qxhGEgk',
      authorBadge: 'Chuyên gia',
      timeAgo: '1d', // 1 day
      category: 'Kinh nghiệm làm mẹ',
      title: 'guest.community.posts.depression.title',
      content: 'guest.community.posts.depression.content',
      likes: 512,
      comments: 143,
      isLiked: false,
      isSaved: true,
    },
  ];

  trendingTopics: TrendingTopic[] = [
    { rank: 1, title: 'guest.community.trending.topic1', views: '1.2k' },
    { rank: 2, title: 'guest.community.trending.topic2', views: '856' },
    { rank: 3, title: 'guest.community.trending.topic3', views: '734' },
    { rank: 4, title: 'guest.community.trending.topic4', views: '621' },
  ];

  recentComments: RecentComment[] = [
    {
      authorName: 'Mẹ Bắp',
      authorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6E6Yh0L68BMdl644GtzaPoeVQ6kUftUwfCttkD4oYNgjTOiUq0EIJxAZqUzyZnFZQRDbYM2vHImCVsimflnep6_JR6S8tTKzMUHugk3Rf-ThlrkxKmNUwW8PvB5nJmb9x4JQTxLuZnZn4ibjSP34hz4uQk1g4EPfzrnyR_KQvtzH3ukHkdmbYAT4SGgiMfV9KHYqEH-KPzgpczzVa-v-KOLZO6Ser3KbWWv_DiHR8vfVIJoDuhof781di0bOu25pR-50TjOYyt1Q',
      postTitle: 'guest.community.recent.comment1.postTitle',
      excerpt: 'guest.community.recent.comment1.excerpt',
      timeAgo: '5',
    },
    {
      authorName: 'Mẹ Cún Híp',
      authorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAW8PDqGRZUJrImWr19pwqaizpuWwkLJjD2BCeEPgI0kLuZdffgkz10u1981HGX9RNVPpsS89lj8poVASZEKbSVlTC9fZrtKotY7yiASngk27BKyIq4b4LSjJJeCmrH1EzrziP2FBNez45ZjhRL6UHlBw-D9ESaYHD0h1sfVbuzufm02W75roHV7yCi7rJsDVj7-L50KQF9zmtuOIk06a3xtLXP5_9RiwXtRvncF_FKY_zVDzrAbxdnBzrClx_ozI6HYy72qxhGEgk',
      postTitle: 'guest.community.recent.comment2.postTitle',
      excerpt: 'guest.community.recent.comment2.excerpt',
      timeAgo: '12',
    },
    {
      authorName: 'BS. Nguyễn Thu',
      authorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATyZtCqbymVujEXs_JZk10V8MMU86D9plYPt58Isv01gy5w26mEDt1MxXcn7itkEkNYu5DAmEqXK73O5Wn_dbPabD8UU0ZBtR7IP8KeYv-ro8rV8TFa9ZvCwUi4AOsgwjbapkz_Tq2Dh-yUFlHrNmPPSerrfw_Uo-sFIo7-QbFnmJjWbBasc-Yd0seihTxjcnU7uaJLuoGcVPfEZ59SVAh_xWnBJCpJMYxfh_rnRvVCVTTdbtI00U4hzMYZ_pZ3Fu1lNyH78RkovQ',
      postTitle: 'guest.community.recent.comment3.postTitle',
      excerpt: 'guest.community.recent.comment3.excerpt',
      timeAgo: '28',
    },
  ];

  getCategoryKey(category: string): string {
    switch (category) {
      case 'Giấc ngủ của bé': return 'guest.community.filters.sleep';
      case 'Dinh dưỡng & Ăn dặm': return 'guest.community.filters.nutrition';
      case 'Kinh nghiệm làm mẹ': return 'guest.community.filters.experience';
      case 'Review đồ dùng': return 'guest.community.filters.review';
      case 'Thông báo': return 'guest.community.filters.notice';
      default: return 'guest.community.filters.all';
    }
  }

  get filteredPosts(): Post[] {
    if (this.activeFilter === 'Tất cả') return this.allPosts;
    return this.allPosts.filter(p => p.category === this.activeFilter || p.isPinned);
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
  }

  toggleLike(post: Post, event: Event): void {
    event.stopPropagation();
    post.isLiked = !post.isLiked;
    post.likes += post.isLiked ? 1 : -1;
  }

  toggleSave(post: Post, event: Event): void {
    event.stopPropagation();
    post.isSaved = !post.isSaved;
  }

  openNewPostForm(): void {
    this.showNewPostForm = true;
    setTimeout(() => {
      document.getElementById('new-post-title')?.focus();
    }, 100);
  }

  closeNewPostForm(): void {
    this.showNewPostForm = false;
    this.newPostTitle = '';
    this.newPostContent = '';
  }

  submitPost(): void {
    if (!this.newPostTitle.trim() || !this.newPostContent.trim()) return;
    const newPost: Post = {
      id: Date.now(),
      authorName: 'Bạn',
      authorAvatar: '',
      timeAgo: '0', // Just now
      category: this.newPostCategory,
      title: this.newPostTitle.trim(),
      content: this.newPostContent.trim(),
      likes: 0,
      comments: 0,
      isLiked: false,
      isSaved: false,
    };
    this.allPosts.splice(1, 0, newPost);
    this.closeNewPostForm();
  }

  navigateToLogin(): void {
    this.router.navigate(['/app/login'], { queryParams: { from: 'cong-dong' } });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeNewPostForm();
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
