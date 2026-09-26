import { Router } from 'express';
import { NotFoundError } from '../errors.js';
import * as repo from '../listingsRepo.js';
import {
  createListingSchema,
  updateListingSchema,
  idParamSchema,
  listQuerySchema,
  searchQuerySchema,
  validate,
  type Pagination,
} from '../validation.js';

function paginated<T>({ items, total }: repo.Page<T>, { page, limit }: Pagination) {
  return {
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export function listingsRouter() {
  const router = Router();

  router.get('/', async (req, res) => {
    const query = validate(listQuerySchema, req.query);
    res.json(paginated(await repo.listListings(query), query));
  });

  // Must be registered before /:id
  router.get('/search', async (req, res) => {
    const query = validate(searchQuerySchema, req.query);
    res.json(paginated(await repo.searchListings(query), query));
  });

  router.post('/', async (req, res) => {
    const body = validate(createListingSchema, req.body);
    res.status(201).json({ data: await repo.createListing(body) });
  });

  router.get('/:id', async (req, res) => {
    const { id } = validate(idParamSchema, req.params);
    const listing = await repo.findListing(id);
    if (!listing) throw new NotFoundError('Listing not found');
    res.json({ data: listing });
  });

  router.patch('/:id', async (req, res) => {
    const { id } = validate(idParamSchema, req.params);
    const changes = validate(updateListingSchema, req.body);
    const listing = await repo.updateListing(id, changes);
    if (!listing) throw new NotFoundError('Listing not found');
    res.json({ data: listing });
  });

  router.delete('/:id', async (req, res) => {
    const { id } = validate(idParamSchema, req.params);
    if (!(await repo.deleteListing(id))) throw new NotFoundError('Listing not found');
    res.status(204).end();
  });

  return router;
}
