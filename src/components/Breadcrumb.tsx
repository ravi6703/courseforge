import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="flex items-center gap-2">
    {items.map((item, index) => (
      <React.Fragment key={index}>
        {index > 0 && <ChevronRight className="w-4 h-4 text-bi-navy-400" />}
        {item.href ? (
          <Link href={item.href} className="text-bi-blue-600 hover:text-bi-blue-700 text-sm">
            {item.label}
          </Link>
        ) : (
          <span className="text-bi-navy-700 text-sm font-medium">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);

export { Breadcrumb };
