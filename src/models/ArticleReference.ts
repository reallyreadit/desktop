export type ArticleUrlReference = { url: string };
export type ArticleSlugReference = { slug: string };
export type ArticleReference =  ArticleUrlReference | ArticleSlugReference;
export function isArticleUrlReference(reference: ArticleReference): reference is ArticleUrlReference {
	return typeof (reference as ArticleUrlReference).url === 'string';
}