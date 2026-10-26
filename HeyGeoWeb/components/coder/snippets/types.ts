// Shared types for InsertMenu snippet groups

export interface InsertSnippet {
  label: string;
  code: string;
}

export interface Category {
  name: string;
  items: InsertSnippet[];
}

export interface Group {
  name: string;
  categories: Category[];
}
