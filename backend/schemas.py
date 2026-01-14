from pydantic import BaseModel, Field
from typing import List, Optional

class Link(BaseModel):
    title: str
    url: str

class Section(BaseModel):
    heading: str
    paragraphs: List[str]

class Article(BaseModel):
    title: str
    sections: List[Section]
    key_takeaways: List[str] = Field(default_factory=list)
    relevant_links: List[Link] = Field(default_factory=list)

class SEO(BaseModel):
    meta_title: str
    meta_description: str
    keywords: List[str]
