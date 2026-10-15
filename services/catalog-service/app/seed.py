"""Seed the catalog with 100 real books.

Usage (inside the catalog image):  python -m app.seed
Idempotent: re-running skips books that already exist (UNIQUE title+author).
"""

import asyncio
import random
from urllib.parse import quote_plus

from .deps import CACHE_VERSION_KEY, SCHEMA, create_pool, create_redis

# (title, author, year, genre)
BOOKS = [
    ("Cien años de soledad", "Gabriel García Márquez", 1967, "Novela"),
    ("El amor en los tiempos del cólera", "Gabriel García Márquez", 1985, "Novela"),
    ("Crónica de una muerte anunciada", "Gabriel García Márquez", 1981, "Novela"),
    ("Don Quijote de la Mancha", "Miguel de Cervantes", 1605, "Clásico"),
    ("La sombra del viento", "Carlos Ruiz Zafón", 2001, "Misterio"),
    ("Rayuela", "Julio Cortázar", 1963, "Novela"),
    ("Pedro Páramo", "Juan Rulfo", 1955, "Novela"),
    ("Ficciones", "Jorge Luis Borges", 1944, "Cuento"),
    ("El Aleph", "Jorge Luis Borges", 1949, "Cuento"),
    ("La casa de los espíritus", "Isabel Allende", 1982, "Novela"),
    ("La ciudad y los perros", "Mario Vargas Llosa", 1963, "Novela"),
    ("Conversación en La Catedral", "Mario Vargas Llosa", 1969, "Novela"),
    ("El túnel", "Ernesto Sabato", 1948, "Novela"),
    ("Como agua para chocolate", "Laura Esquivel", 1989, "Novela"),
    ("Los detectives salvajes", "Roberto Bolaño", 1998, "Novela"),
    ("2666", "Roberto Bolaño", 2004, "Novela"),
    ("La tregua", "Mario Benedetti", 1960, "Novela"),
    ("Aura", "Carlos Fuentes", 1962, "Novela"),
    ("El laberinto de la soledad", "Octavio Paz", 1950, "Ensayo"),
    ("Veinte poemas de amor y una canción desesperada", "Pablo Neruda", 1924, "Poesía"),
    ("Bodas de sangre", "Federico García Lorca", 1933, "Teatro"),
    ("La colmena", "Camilo José Cela", 1951, "Novela"),
    ("Nada", "Carmen Laforet", 1945, "Novela"),
    ("Niebla", "Miguel de Unamuno", 1914, "Novela"),
    ("Platero y yo", "Juan Ramón Jiménez", 1914, "Poesía"),
    ("Las batallas en el desierto", "José Emilio Pacheco", 1981, "Novela"),
    ("1984", "George Orwell", 1949, "Ciencia ficción"),
    ("Rebelión en la granja", "George Orwell", 1945, "Sátira"),
    ("Un mundo feliz", "Aldous Huxley", 1932, "Ciencia ficción"),
    ("Fahrenheit 451", "Ray Bradbury", 1953, "Ciencia ficción"),
    ("Crónicas marcianas", "Ray Bradbury", 1950, "Ciencia ficción"),
    ("Dune", "Frank Herbert", 1965, "Ciencia ficción"),
    ("Fundación", "Isaac Asimov", 1951, "Ciencia ficción"),
    ("Yo, robot", "Isaac Asimov", 1950, "Ciencia ficción"),
    ("Neuromante", "William Gibson", 1984, "Ciencia ficción"),
    ("¿Sueñan los androides con ovejas eléctricas?", "Philip K. Dick", 1968, "Ciencia ficción"),
    ("La mano izquierda de la oscuridad", "Ursula K. Le Guin", 1969, "Ciencia ficción"),
    ("Un mago de Terramar", "Ursula K. Le Guin", 1968, "Fantasía"),
    ("Solaris", "Stanisław Lem", 1961, "Ciencia ficción"),
    ("La guía del autoestopista galáctico", "Douglas Adams", 1979, "Ciencia ficción"),
    ("Frankenstein", "Mary Shelley", 1818, "Terror"),
    ("Drácula", "Bram Stoker", 1897, "Terror"),
    ("El resplandor", "Stephen King", 1977, "Terror"),
    ("It", "Stephen King", 1986, "Terror"),
    ("El señor de los anillos", "J. R. R. Tolkien", 1954, "Fantasía"),
    ("El hobbit", "J. R. R. Tolkien", 1937, "Fantasía"),
    ("Harry Potter y la piedra filosofal", "J. K. Rowling", 1997, "Fantasía"),
    ("Juego de tronos", "George R. R. Martin", 1996, "Fantasía"),
    ("El nombre del viento", "Patrick Rothfuss", 2007, "Fantasía"),
    ("La historia interminable", "Michael Ende", 1979, "Fantasía"),
    ("Momo", "Michael Ende", 1973, "Fantasía"),
    ("El principito", "Antoine de Saint-Exupéry", 1943, "Infantil"),
    ("Alicia en el país de las maravillas", "Lewis Carroll", 1865, "Infantil"),
    ("Orgullo y prejuicio", "Jane Austen", 1813, "Clásico"),
    ("Emma", "Jane Austen", 1815, "Clásico"),
    ("Jane Eyre", "Charlotte Brontë", 1847, "Clásico"),
    ("Cumbres borrascosas", "Emily Brontë", 1847, "Clásico"),
    ("Moby Dick", "Herman Melville", 1851, "Clásico"),
    ("Grandes esperanzas", "Charles Dickens", 1861, "Clásico"),
    ("Oliver Twist", "Charles Dickens", 1838, "Clásico"),
    ("Crimen y castigo", "Fiódor Dostoyevski", 1866, "Clásico"),
    ("Los hermanos Karamázov", "Fiódor Dostoyevski", 1880, "Clásico"),
    ("Guerra y paz", "León Tolstói", 1869, "Clásico"),
    ("Ana Karénina", "León Tolstói", 1877, "Clásico"),
    ("Madame Bovary", "Gustave Flaubert", 1857, "Clásico"),
    ("Los miserables", "Victor Hugo", 1862, "Clásico"),
    ("El conde de Montecristo", "Alexandre Dumas", 1844, "Aventura"),
    ("Los tres mosqueteros", "Alexandre Dumas", 1844, "Aventura"),
    ("Veinte mil leguas de viaje submarino", "Julio Verne", 1870, "Aventura"),
    ("La vuelta al mundo en ochenta días", "Julio Verne", 1872, "Aventura"),
    ("La isla del tesoro", "Robert Louis Stevenson", 1883, "Aventura"),
    ("El extraño caso del Dr. Jekyll y Mr. Hyde", "Robert Louis Stevenson", 1886, "Terror"),
    ("El retrato de Dorian Gray", "Oscar Wilde", 1890, "Clásico"),
    ("La metamorfosis", "Franz Kafka", 1915, "Clásico"),
    ("El proceso", "Franz Kafka", 1925, "Clásico"),
    ("Ulises", "James Joyce", 1922, "Clásico"),
    ("La señora Dalloway", "Virginia Woolf", 1925, "Clásico"),
    ("Al faro", "Virginia Woolf", 1927, "Clásico"),
    ("El gran Gatsby", "F. Scott Fitzgerald", 1925, "Clásico"),
    ("El viejo y el mar", "Ernest Hemingway", 1952, "Novela"),
    ("Por quién doblan las campanas", "Ernest Hemingway", 1940, "Novela"),
    ("Las uvas de la ira", "John Steinbeck", 1939, "Novela"),
    ("De ratones y hombres", "John Steinbeck", 1937, "Novela"),
    ("Matar a un ruiseñor", "Harper Lee", 1960, "Novela"),
    ("El guardián entre el centeno", "J. D. Salinger", 1951, "Novela"),
    ("Lolita", "Vladimir Nabokov", 1955, "Novela"),
    ("En el camino", "Jack Kerouac", 1957, "Novela"),
    ("Beloved", "Toni Morrison", 1987, "Novela"),
    ("El cuento de la criada", "Margaret Atwood", 1985, "Ciencia ficción"),
    ("La carretera", "Cormac McCarthy", 2006, "Novela"),
    ("Tokio blues", "Haruki Murakami", 1987, "Novela"),
    ("Kafka en la orilla", "Haruki Murakami", 2002, "Novela"),
    ("Nunca me abandones", "Kazuo Ishiguro", 2005, "Novela"),
    ("El nombre de la rosa", "Umberto Eco", 1980, "Misterio"),
    ("El perfume", "Patrick Süskind", 1985, "Misterio"),
    ("Diez negritos", "Agatha Christie", 1939, "Misterio"),
    ("Asesinato en el Orient Express", "Agatha Christie", 1934, "Misterio"),
    ("El sabueso de los Baskerville", "Arthur Conan Doyle", 1902, "Misterio"),
    ("Sapiens: De animales a dioses", "Yuval Noah Harari", 2011, "Ensayo"),
    ("Breve historia del tiempo", "Stephen Hawking", 1988, "Divulgación"),
]

assert len(BOOKS) == 100, len(BOOKS)
assert len({(t, a) for t, a, *_ in BOOKS}) == 100, "duplicate book"


def cover_url(title: str) -> str:
    # Black & white editorial placeholder (400x600, 2:3 book ratio).
    return f"https://placehold.co/400x600/0a0a0a/fafafa/png?font=playfair-display&text={quote_plus(title)}"


async def main() -> None:
    rng = random.Random(42)  # deterministic availability for reproducible demos
    pool = await create_pool()
    redis = create_redis()
    try:
        async with pool.acquire() as conn:
            await conn.execute(SCHEMA)
            inserted = 0
            for title, author, year, genre in BOOKS:
                copies = rng.randint(1, 5)
                status = await conn.execute(
                    """INSERT INTO books (title, author, year, genre, description, cover_url, total_copies, available_copies)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
                       ON CONFLICT (title, author) DO NOTHING""",
                    title, author, year, genre,
                    f"{title} ({year}), de {author}.", cover_url(title), copies,
                )
                inserted += status == "INSERT 0 1"
        await redis.incr(CACHE_VERSION_KEY)
        print(f"Seed complete: {inserted} inserted, {len(BOOKS) - inserted} already present.")
    finally:
        await pool.close()
        await redis.aclose()


if __name__ == "__main__":
    asyncio.run(main())
